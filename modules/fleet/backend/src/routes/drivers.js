const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const db = require('../db/connection');
const { handleValidation } = require('../middleware/validation');
const { authenticate, authorize } = require('../middleware/auth');
const { emitDriverAssignment } = require('../services/socketService');

// Apply authentication to all routes
router.use(authenticate);

// Validation rules
const driverValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required'),
  body('phone').optional().trim(),
  body('license_number').trim().notEmpty().withMessage('License number required'),
  body('license_expiry').isISO8601().withMessage('Valid license expiry date required'),
  handleValidation
];

/**
 * GET /api/drivers
 * Get all drivers
 */
router.get('/', async (req, res) => {
  try {
    const { status, search, available } = req.query;

    let query = db('drivers')
      .leftJoin('trucks', 'drivers.assigned_truck_id', 'trucks.id')
      .select(
        'drivers.*',
        'trucks.plate_number as truck_plate',
        'trucks.make as truck_make',
        'trucks.model as truck_model'
      );

    if (status) {
      query = query.where('drivers.status', status);
    }

    if (available === 'true') {
      query = query.whereNull('drivers.assigned_truck_id')
        .where('drivers.status', '!=', 'inactive');
    }

    if (search) {
      query = query.where(function() {
        this.where('drivers.name', 'ilike', `%${search}%`)
          .orWhere('drivers.email', 'ilike', `%${search}%`)
          .orWhere('drivers.license_number', 'ilike', `%${search}%`);
      });
    }

    const drivers = await query.orderBy('drivers.name');

    res.json({ drivers });
  } catch (error) {
    console.error('Get drivers error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch drivers' } });
  }
});

/**
 * GET /api/drivers/:id
 * Get single driver
 */
router.get('/:id', [
  param('id').isInt().withMessage('Invalid driver ID'),
  handleValidation
], async (req, res) => {
  try {
    const driver = await db('drivers')
      .leftJoin('trucks', 'drivers.assigned_truck_id', 'trucks.id')
      .where('drivers.id', req.params.id)
      .select(
        'drivers.*',
        'trucks.plate_number as truck_plate',
        'trucks.make as truck_make',
        'trucks.model as truck_model',
        'trucks.status as truck_status'
      )
      .first();

    if (!driver) {
      return res.status(404).json({ error: { message: 'Driver not found' } });
    }

    // Get recent trips/activity
    const recentActivity = await db('gps_data')
      .where({ truck_id: driver.assigned_truck_id })
      .orderBy('recorded_at', 'desc')
      .limit(10);

    res.json({
      driver: {
        ...driver,
        recentActivity
      }
    });
  } catch (error) {
    console.error('Get driver error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch driver' } });
  }
});

/**
 * POST /api/drivers
 * Create new driver
 */
router.post('/', authorize('admin', 'manager'), driverValidation, async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      license_number,
      license_expiry,
      emergency_contact_name,
      emergency_contact_phone,
      notes
    } = req.body;

    const [driver] = await db('drivers')
      .insert({
        name,
        email,
        phone,
        license_number,
        license_expiry,
        emergency_contact_name,
        emergency_contact_phone,
        notes,
        status: 'available'
      })
      .returning('*');

    res.status(201).json({ message: 'Driver created successfully', driver });
  } catch (error) {
    console.error('Create driver error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: { message: 'License number or email already exists' } });
    }
    res.status(500).json({ error: { message: 'Failed to create driver' } });
  }
});

/**
 * PUT /api/drivers/:id
 * Update driver
 */
router.put('/:id', authorize('admin', 'manager'), [
  param('id').isInt().withMessage('Invalid driver ID'),
  body('name').optional().trim().notEmpty(),
  body('email').optional().isEmail().normalizeEmail(),
  body('license_expiry').optional().isISO8601(),
  handleValidation
], async (req, res) => {
  try {
    const driver = await db('drivers').where({ id: req.params.id }).first();
    if (!driver) {
      return res.status(404).json({ error: { message: 'Driver not found' } });
    }

    const {
      name,
      email,
      phone,
      license_number,
      license_expiry,
      status,
      emergency_contact_name,
      emergency_contact_phone,
      notes
    } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (license_number !== undefined) updateData.license_number = license_number;
    if (license_expiry !== undefined) updateData.license_expiry = license_expiry;
    if (emergency_contact_name !== undefined) updateData.emergency_contact_name = emergency_contact_name;
    if (emergency_contact_phone !== undefined) updateData.emergency_contact_phone = emergency_contact_phone;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined && ['available', 'on_duty', 'off_duty', 'inactive'].includes(status)) {
      updateData.status = status;
    }

    const [updatedDriver] = await db('drivers')
      .where({ id: req.params.id })
      .update(updateData)
      .returning('*');

    res.json({ message: 'Driver updated successfully', driver: updatedDriver });
  } catch (error) {
    console.error('Update driver error:', error);
    res.status(500).json({ error: { message: 'Failed to update driver' } });
  }
});

/**
 * PUT /api/drivers/:id/assign
 * Assign driver to truck
 */
router.put('/:id/assign', authorize('admin', 'manager'), [
  param('id').isInt().withMessage('Invalid driver ID'),
  body('truck_id').optional({ nullable: true }).matches(/^TRK-\d{3}$|^$/).withMessage('Invalid truck ID format'),
  handleValidation
], async (req, res) => {
  try {
    const { truck_id } = req.body;
    const driverId = parseInt(req.params.id);

    const driver = await db('drivers').where({ id: driverId }).first();
    if (!driver) {
      return res.status(404).json({ error: { message: 'Driver not found' } });
    }

    // If assigning to a truck
    if (truck_id) {
      const truck = await db('trucks').where({ id: truck_id }).first();
      if (!truck) {
        return res.status(404).json({ error: { message: 'Truck not found' } });
      }

      // Check if truck already has a driver
      const existingDriver = await db('drivers')
        .where({ assigned_truck_id: truck_id })
        .whereNot({ id: driverId })
        .first();

      if (existingDriver) {
        return res.status(400).json({
          error: { message: `Truck already assigned to ${existingDriver.name}` }
        });
      }

      // Unassign from previous truck if any
      if (driver.assigned_truck_id && driver.assigned_truck_id !== truck_id) {
        emitDriverAssignment(driverId, driver.assigned_truck_id, 'unassigned');
      }

      // Assign to new truck
      await db('drivers')
        .where({ id: driverId })
        .update({
          assigned_truck_id: truck_id,
          status: 'on_duty'
        });

      emitDriverAssignment(driverId, truck_id, 'assigned');

      res.json({ message: `Driver assigned to ${truck_id}` });
    } else {
      // Unassign from truck
      const previousTruckId = driver.assigned_truck_id;

      await db('drivers')
        .where({ id: driverId })
        .update({
          assigned_truck_id: null,
          status: 'available'
        });

      if (previousTruckId) {
        emitDriverAssignment(driverId, previousTruckId, 'unassigned');
      }

      res.json({ message: 'Driver unassigned from truck' });
    }
  } catch (error) {
    console.error('Assign driver error:', error);
    res.status(500).json({ error: { message: 'Failed to assign driver' } });
  }
});

/**
 * DELETE /api/drivers/:id
 * Delete driver (soft delete)
 */
router.delete('/:id', authorize('admin'), [
  param('id').isInt().withMessage('Invalid driver ID'),
  handleValidation
], async (req, res) => {
  try {
    const driver = await db('drivers').where({ id: req.params.id }).first();
    if (!driver) {
      return res.status(404).json({ error: { message: 'Driver not found' } });
    }

    // Soft delete
    await db('drivers')
      .where({ id: req.params.id })
      .update({
        status: 'inactive',
        assigned_truck_id: null
      });

    if (driver.assigned_truck_id) {
      emitDriverAssignment(req.params.id, driver.assigned_truck_id, 'unassigned');
    }

    res.json({ message: 'Driver deleted successfully' });
  } catch (error) {
    console.error('Delete driver error:', error);
    res.status(500).json({ error: { message: 'Failed to delete driver' } });
  }
});

module.exports = router;
