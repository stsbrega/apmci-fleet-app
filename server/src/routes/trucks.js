const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const db = require('../db/connection');
const { handleValidation } = require('../middleware/validation');
const { authenticate, authorize } = require('../middleware/auth');
const { emitTruckStatusChange } = require('../services/socketService');

// Apply authentication to all routes
router.use(authenticate);

// Validation rules
const truckValidation = [
  body('id').optional().matches(/^TRK-\d{3}$/).withMessage('ID must be in format TRK-XXX'),
  body('plate_number').trim().notEmpty().withMessage('Plate number required'),
  body('make').optional().trim(),
  body('model').optional().trim(),
  body('year').optional().isInt({ min: 1990, max: new Date().getFullYear() + 1 }),
  body('fuel_capacity').optional().isFloat({ min: 0 }),
  handleValidation
];

/**
 * GET /api/trucks
 * Get all trucks with latest GPS and driver info
 */
router.get('/', async (req, res) => {
  try {
    const { status, search } = req.query;

    let query = db('trucks')
      .leftJoin('drivers', 'trucks.id', 'drivers.assigned_truck_id')
      .select(
        'trucks.*',
        'drivers.id as driver_id',
        'drivers.name as driver_name',
        'drivers.phone as driver_phone'
      );

    if (status) {
      query = query.where('trucks.status', status);
    }

    if (search) {
      query = query.where(function() {
        this.where('trucks.id', 'ilike', `%${search}%`)
          .orWhere('trucks.plate_number', 'ilike', `%${search}%`)
          .orWhere('drivers.name', 'ilike', `%${search}%`);
      });
    }

    const trucks = await query.orderBy('trucks.id');

    // Get latest GPS data for each truck
    const trucksWithGps = await Promise.all(trucks.map(async (truck) => {
      const latestGps = await db('gps_data')
        .where({ truck_id: truck.id })
        .orderBy('recorded_at', 'desc')
        .first();

      return {
        ...truck,
        location: latestGps ? {
          latitude: parseFloat(latestGps.latitude),
          longitude: parseFloat(latestGps.longitude),
          speed: parseFloat(latestGps.speed),
          heading: latestGps.heading ? parseFloat(latestGps.heading) : null,
          city: latestGps.city,
          route: latestGps.route_info,
          lastUpdate: latestGps.recorded_at,
          timestamp: latestGps.recorded_at
        } : null
      };
    }));

    res.json({ trucks: trucksWithGps });
  } catch (error) {
    console.error('Get trucks error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch trucks' } });
  }
});

/**
 * GET /api/trucks/:id
 * Get single truck with full details
 */
router.get('/:id', [
  param('id').matches(/^TRK-\d{3}$/).withMessage('Invalid truck ID format'),
  handleValidation
], async (req, res) => {
  try {
    const truck = await db('trucks')
      .leftJoin('drivers', 'trucks.id', 'drivers.assigned_truck_id')
      .where('trucks.id', req.params.id)
      .select(
        'trucks.*',
        'drivers.id as driver_id',
        'drivers.name as driver_name',
        'drivers.phone as driver_phone',
        'drivers.email as driver_email'
      )
      .first();

    if (!truck) {
      return res.status(404).json({ error: { message: 'Truck not found' } });
    }

    // Get latest GPS data
    const latestGps = await db('gps_data')
      .where({ truck_id: truck.id })
      .orderBy('recorded_at', 'desc')
      .first();

    // Get recent fuel records
    const fuelRecords = await db('fuel_records')
      .where({ truck_id: truck.id })
      .orderBy('recorded_at', 'desc')
      .limit(10);

    // Get upcoming maintenance
    const maintenance = await db('maintenance_records')
      .where({ truck_id: truck.id })
      .whereIn('status', ['scheduled', 'in_progress'])
      .orderBy('scheduled_date', 'asc')
      .limit(5);

    // Get recent alerts
    const alerts = await db('alerts')
      .where({ truck_id: truck.id })
      .orderBy('created_at', 'desc')
      .limit(10);

    res.json({
      truck: {
        ...truck,
        location: latestGps ? {
          latitude: parseFloat(latestGps.latitude),
          longitude: parseFloat(latestGps.longitude),
          speed: parseFloat(latestGps.speed),
          heading: latestGps.heading ? parseFloat(latestGps.heading) : null,
          city: latestGps.city,
          route: latestGps.route_info,
          lastUpdate: latestGps.recorded_at
        } : null,
        fuelRecords,
        maintenance,
        alerts
      }
    });
  } catch (error) {
    console.error('Get truck error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch truck' } });
  }
});

/**
 * POST /api/trucks
 * Create new truck
 */
router.post('/', authorize('admin', 'manager'), truckValidation, async (req, res) => {
  try {
    const {
      id,
      plate_number,
      make,
      model,
      year,
      vin,
      fuel_capacity,
      gps_device_id
    } = req.body;

    // Generate ID if not provided
    let truckId = id;
    if (!truckId) {
      const lastTruck = await db('trucks')
        .orderBy('id', 'desc')
        .first();

      if (lastTruck) {
        const lastNum = parseInt(lastTruck.id.split('-')[1]);
        truckId = `TRK-${String(lastNum + 1).padStart(3, '0')}`;
      } else {
        truckId = 'TRK-001';
      }
    }

    const [truck] = await db('trucks')
      .insert({
        id: truckId,
        plate_number,
        make,
        model,
        year,
        vin,
        fuel_capacity: fuel_capacity || 300,
        gps_device_id,
        status: 'idle'
      })
      .returning('*');

    res.status(201).json({ message: 'Truck created successfully', truck });
  } catch (error) {
    console.error('Create truck error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: { message: 'Truck ID or plate number already exists' } });
    }
    res.status(500).json({ error: { message: 'Failed to create truck' } });
  }
});

/**
 * PUT /api/trucks/:id
 * Update truck
 */
router.put('/:id', authorize('admin', 'manager'), [
  param('id').matches(/^TRK-\d{3}$/).withMessage('Invalid truck ID format'),
  ...truckValidation
], async (req, res) => {
  try {
    const { plate_number, make, model, year, vin, fuel_capacity, status, gps_device_id } = req.body;

    const truck = await db('trucks').where({ id: req.params.id }).first();
    if (!truck) {
      return res.status(404).json({ error: { message: 'Truck not found' } });
    }

    const updateData = {};
    if (plate_number !== undefined) updateData.plate_number = plate_number;
    if (make !== undefined) updateData.make = make;
    if (model !== undefined) updateData.model = model;
    if (year !== undefined) updateData.year = year;
    if (vin !== undefined) updateData.vin = vin;
    if (fuel_capacity !== undefined) updateData.fuel_capacity = fuel_capacity;
    if (gps_device_id !== undefined) updateData.gps_device_id = gps_device_id;
    if (status !== undefined && ['active', 'idle', 'maintenance', 'inactive'].includes(status)) {
      updateData.status = status;
    }

    const [updatedTruck] = await db('trucks')
      .where({ id: req.params.id })
      .update(updateData)
      .returning('*');

    // Emit status change if status was updated
    if (status && status !== truck.status) {
      emitTruckStatusChange(req.params.id, status);
    }

    res.json({ message: 'Truck updated successfully', truck: updatedTruck });
  } catch (error) {
    console.error('Update truck error:', error);
    res.status(500).json({ error: { message: 'Failed to update truck' } });
  }
});

/**
 * DELETE /api/trucks/:id
 * Delete truck (soft delete by setting inactive)
 */
router.delete('/:id', authorize('admin'), [
  param('id').matches(/^TRK-\d{3}$/).withMessage('Invalid truck ID format'),
  handleValidation
], async (req, res) => {
  try {
    const truck = await db('trucks').where({ id: req.params.id }).first();
    if (!truck) {
      return res.status(404).json({ error: { message: 'Truck not found' } });
    }

    // Unassign any driver
    await db('drivers')
      .where({ assigned_truck_id: req.params.id })
      .update({ assigned_truck_id: null, status: 'available' });

    // Soft delete
    await db('trucks')
      .where({ id: req.params.id })
      .update({ status: 'inactive' });

    res.json({ message: 'Truck deleted successfully' });
  } catch (error) {
    console.error('Delete truck error:', error);
    res.status(500).json({ error: { message: 'Failed to delete truck' } });
  }
});

/**
 * GET /api/trucks/stats/summary
 * Get fleet statistics
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const trucks = await db('trucks').whereNot('status', 'inactive');

    const stats = {
      total: trucks.length,
      active: trucks.filter(t => t.status === 'active').length,
      idle: trucks.filter(t => t.status === 'idle').length,
      maintenance: trucks.filter(t => t.status === 'maintenance').length,
      avgFuelLevel: trucks.reduce((acc, t) => acc + parseFloat(t.current_fuel_level || 0), 0) / trucks.length || 0,
      totalMileage: trucks.reduce((acc, t) => acc + parseFloat(t.odometer || 0), 0)
    };

    res.json({ stats });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch stats' } });
  }
});

module.exports = router;
