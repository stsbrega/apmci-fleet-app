const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const db = require('../db/connection');
const { handleValidation } = require('../middleware/validation');
const { authenticate, authorize } = require('../middleware/auth');
const { emitTruckStatusChange } = require('../services/socketService');

// Apply authentication to all routes
router.use(authenticate);

// Validation rules
const maintenanceValidation = [
  body('truck_id').matches(/^TRK-\d{3}$/).withMessage('Invalid truck ID format'),
  body('type').isIn([
    'oil_change', 'tire_rotation', 'tire_replacement', 'brake_service',
    'engine_service', 'transmission_service', 'inspection', 'repair', 'other'
  ]).withMessage('Invalid maintenance type'),
  body('title').trim().notEmpty().withMessage('Title required'),
  body('scheduled_date').optional().isISO8601(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  handleValidation
];

/**
 * GET /api/maintenance
 * Get all maintenance records
 */
router.get('/', async (req, res) => {
  try {
    const { truck_id, status, type, priority, upcoming } = req.query;

    let query = db('maintenance_records')
      .join('trucks', 'maintenance_records.truck_id', 'trucks.id')
      .select(
        'maintenance_records.*',
        'trucks.plate_number',
        'trucks.make',
        'trucks.model'
      );

    if (truck_id) {
      query = query.where('maintenance_records.truck_id', truck_id);
    }

    if (status) {
      query = query.where('maintenance_records.status', status);
    }

    if (type) {
      query = query.where('maintenance_records.type', type);
    }

    if (priority) {
      query = query.where('maintenance_records.priority', priority);
    }

    if (upcoming === 'true') {
      query = query
        .whereIn('maintenance_records.status', ['scheduled', 'in_progress'])
        .orderBy('scheduled_date', 'asc');
    } else {
      query = query.orderBy('maintenance_records.created_at', 'desc');
    }

    const records = await query.limit(100);

    res.json({ records });
  } catch (error) {
    console.error('Get maintenance error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch maintenance records' } });
  }
});

/**
 * GET /api/maintenance/:id
 * Get single maintenance record
 */
router.get('/:id', [
  param('id').isInt().withMessage('Invalid record ID'),
  handleValidation
], async (req, res) => {
  try {
    const record = await db('maintenance_records')
      .join('trucks', 'maintenance_records.truck_id', 'trucks.id')
      .leftJoin('users', 'maintenance_records.created_by', 'users.id')
      .where('maintenance_records.id', req.params.id)
      .select(
        'maintenance_records.*',
        'trucks.plate_number',
        'trucks.make',
        'trucks.model',
        'users.name as created_by_name'
      )
      .first();

    if (!record) {
      return res.status(404).json({ error: { message: 'Record not found' } });
    }

    res.json({ record });
  } catch (error) {
    console.error('Get maintenance record error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch record' } });
  }
});

/**
 * POST /api/maintenance
 * Create maintenance record
 */
router.post('/', authorize('admin', 'manager'), maintenanceValidation, async (req, res) => {
  try {
    const {
      truck_id,
      type,
      title,
      description,
      scheduled_date,
      next_service_odometer,
      next_service_date,
      priority = 'medium',
      estimated_cost,
      service_provider,
      notes
    } = req.body;

    // Verify truck exists
    const truck = await db('trucks').where({ id: truck_id }).first();
    if (!truck) {
      return res.status(404).json({ error: { message: 'Truck not found' } });
    }

    const [record] = await db('maintenance_records')
      .insert({
        truck_id,
        type,
        title,
        description,
        scheduled_date,
        odometer_at_service: truck.odometer,
        next_service_odometer,
        next_service_date,
        status: 'scheduled',
        priority,
        estimated_cost,
        service_provider,
        notes,
        created_by: req.user.id
      })
      .returning('*');

    res.status(201).json({ message: 'Maintenance scheduled', record });
  } catch (error) {
    console.error('Create maintenance error:', error);
    res.status(500).json({ error: { message: 'Failed to create record' } });
  }
});

/**
 * PUT /api/maintenance/:id
 * Update maintenance record
 */
router.put('/:id', authorize('admin', 'manager'), [
  param('id').isInt().withMessage('Invalid record ID'),
  body('status').optional().isIn(['scheduled', 'in_progress', 'completed', 'cancelled']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  handleValidation
], async (req, res) => {
  try {
    const record = await db('maintenance_records').where({ id: req.params.id }).first();
    if (!record) {
      return res.status(404).json({ error: { message: 'Record not found' } });
    }

    const {
      type,
      title,
      description,
      scheduled_date,
      completed_date,
      next_service_odometer,
      next_service_date,
      status,
      priority,
      estimated_cost,
      actual_cost,
      service_provider,
      notes
    } = req.body;

    const updateData = {};
    if (type !== undefined) updateData.type = type;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (scheduled_date !== undefined) updateData.scheduled_date = scheduled_date;
    if (completed_date !== undefined) updateData.completed_date = completed_date;
    if (next_service_odometer !== undefined) updateData.next_service_odometer = next_service_odometer;
    if (next_service_date !== undefined) updateData.next_service_date = next_service_date;
    if (priority !== undefined) updateData.priority = priority;
    if (estimated_cost !== undefined) updateData.estimated_cost = estimated_cost;
    if (actual_cost !== undefined) updateData.actual_cost = actual_cost;
    if (service_provider !== undefined) updateData.service_provider = service_provider;
    if (notes !== undefined) updateData.notes = notes;

    // Handle status changes
    if (status !== undefined && status !== record.status) {
      updateData.status = status;

      // If starting maintenance, update truck status
      if (status === 'in_progress') {
        await db('trucks')
          .where({ id: record.truck_id })
          .update({ status: 'maintenance' });
        emitTruckStatusChange(record.truck_id, 'maintenance');
      }

      // If completing/cancelling maintenance, update truck to idle
      if ((status === 'completed' || status === 'cancelled') && record.status === 'in_progress') {
        await db('trucks')
          .where({ id: record.truck_id })
          .update({ status: 'idle' });
        emitTruckStatusChange(record.truck_id, 'idle');

        // Record completion date if completing
        if (status === 'completed' && !completed_date) {
          updateData.completed_date = new Date();

          // Update truck odometer if provided
          const truck = await db('trucks').where({ id: record.truck_id }).first();
          if (actual_cost !== undefined) {
            updateData.odometer_at_service = truck.odometer;
          }
        }
      }
    }

    const [updatedRecord] = await db('maintenance_records')
      .where({ id: req.params.id })
      .update(updateData)
      .returning('*');

    res.json({ message: 'Record updated', record: updatedRecord });
  } catch (error) {
    console.error('Update maintenance error:', error);
    res.status(500).json({ error: { message: 'Failed to update record' } });
  }
});

/**
 * DELETE /api/maintenance/:id
 * Delete maintenance record
 */
router.delete('/:id', authorize('admin'), [
  param('id').isInt().withMessage('Invalid record ID'),
  handleValidation
], async (req, res) => {
  try {
    const record = await db('maintenance_records').where({ id: req.params.id }).first();
    if (!record) {
      return res.status(404).json({ error: { message: 'Record not found' } });
    }

    // If maintenance was in progress, update truck status
    if (record.status === 'in_progress') {
      await db('trucks')
        .where({ id: record.truck_id })
        .update({ status: 'idle' });
      emitTruckStatusChange(record.truck_id, 'idle');
    }

    await db('maintenance_records').where({ id: req.params.id }).delete();

    res.json({ message: 'Record deleted' });
  } catch (error) {
    console.error('Delete maintenance error:', error);
    res.status(500).json({ error: { message: 'Failed to delete record' } });
  }
});

/**
 * GET /api/maintenance/stats/summary
 * Get maintenance statistics
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await db('maintenance_records')
      .select(
        db.raw('COUNT(*) FILTER (WHERE status = \'scheduled\') as scheduled'),
        db.raw('COUNT(*) FILTER (WHERE status = \'in_progress\') as in_progress'),
        db.raw('COUNT(*) FILTER (WHERE status = \'completed\' AND completed_date >= NOW() - INTERVAL \'30 days\') as completed_30d'),
        db.raw('SUM(CASE WHEN status = \'completed\' THEN actual_cost ELSE 0 END) as total_cost_30d')
      )
      .where('created_at', '>=', db.raw("NOW() - INTERVAL '30 days'"))
      .first();

    // Get upcoming high priority
    const urgentMaintenance = await db('maintenance_records')
      .join('trucks', 'maintenance_records.truck_id', 'trucks.id')
      .whereIn('maintenance_records.status', ['scheduled', 'in_progress'])
      .whereIn('maintenance_records.priority', ['high', 'critical'])
      .select(
        'maintenance_records.id',
        'maintenance_records.truck_id',
        'maintenance_records.title',
        'maintenance_records.priority',
        'maintenance_records.scheduled_date',
        'trucks.plate_number'
      )
      .orderBy('maintenance_records.scheduled_date', 'asc')
      .limit(5);

    res.json({
      stats: {
        scheduled: parseInt(stats.scheduled) || 0,
        inProgress: parseInt(stats.in_progress) || 0,
        completedLast30Days: parseInt(stats.completed_30d) || 0,
        totalCostLast30Days: parseFloat(stats.total_cost_30d) || 0
      },
      urgentMaintenance
    });
  } catch (error) {
    console.error('Get maintenance stats error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch stats' } });
  }
});

module.exports = router;
