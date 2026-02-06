const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const db = require('../db/connection');
const { handleValidation } = require('../middleware/validation');
const { authenticate, authorize, authenticateGpsDevice } = require('../middleware/auth');
const { emitFuelUpdate } = require('../services/socketService');
const { checkAndGenerateAlerts } = require('../services/alertService');

// Apply authentication to most routes
router.use((req, res, next) => {
  // Allow POST from GPS devices with API key
  if (req.method === 'POST' && req.headers['x-api-key']) {
    return authenticateGpsDevice(req, res, next);
  }
  return authenticate(req, res, next);
});

/**
 * POST /api/fuel
 * Record fuel reading or refuel event
 */
router.post('/', [
  body('truck_id').matches(/^TRK-\d{3}$/).withMessage('Invalid truck ID format'),
  body('fuel_level').isFloat({ min: 0, max: 100 }).withMessage('Fuel level must be 0-100'),
  body('record_type').optional().isIn(['reading', 'refuel']),
  body('liters_added').optional().isFloat({ min: 0 }),
  body('cost').optional().isFloat({ min: 0 }),
  body('odometer_reading').optional().isFloat({ min: 0 }),
  body('station_name').optional().trim(),
  handleValidation
], async (req, res) => {
  try {
    const {
      truck_id,
      fuel_level,
      record_type = 'reading',
      liters_added,
      cost,
      odometer_reading,
      station_name,
      consumption_rate,
      notes,
      timestamp
    } = req.body;

    // Verify truck exists
    const truck = await db('trucks').where({ id: truck_id }).first();
    if (!truck) {
      return res.status(404).json({ error: { message: 'Truck not found' } });
    }

    // Insert fuel record
    const [fuelRecord] = await db('fuel_records')
      .insert({
        truck_id,
        fuel_level,
        record_type,
        liters_added,
        cost,
        odometer_reading,
        station_name,
        consumption_rate,
        notes,
        recorded_at: timestamp || new Date()
      })
      .returning('*');

    // Update truck's current fuel level and odometer
    const updateData = { current_fuel_level: fuel_level };
    if (odometer_reading) {
      updateData.odometer = odometer_reading;
    }

    await db('trucks').where({ id: truck_id }).update(updateData);

    // Emit real-time update
    emitFuelUpdate(truck_id, {
      fuel_level: parseFloat(fuel_level),
      record_type,
      timestamp: fuelRecord.recorded_at
    });

    // Check for low fuel alerts
    await checkAndGenerateAlerts(truck_id, { fuel_level });

    res.status(201).json({
      message: 'Fuel record saved',
      record: fuelRecord
    });
  } catch (error) {
    console.error('Fuel record error:', error);
    res.status(500).json({ error: { message: 'Failed to save fuel record' } });
  }
});

/**
 * GET /api/fuel/:truckId/history
 * Get fuel history for a truck
 */
router.get('/:truckId/history', [
  param('truckId').matches(/^TRK-\d{3}$/).withMessage('Invalid truck ID format'),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  query('type').optional().isIn(['reading', 'refuel']),
  query('limit').optional().isInt({ min: 1, max: 500 }),
  handleValidation
], async (req, res) => {
  try {
    const { from, to, type, limit = 100 } = req.query;

    let query = db('fuel_records')
      .where({ truck_id: req.params.truckId })
      .orderBy('recorded_at', 'desc')
      .limit(parseInt(limit));

    if (from) {
      query = query.where('recorded_at', '>=', from);
    }

    if (to) {
      query = query.where('recorded_at', '<=', to);
    }

    if (type) {
      query = query.where('record_type', type);
    }

    const history = await query;

    res.json({ history });
  } catch (error) {
    console.error('Get fuel history error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch fuel history' } });
  }
});

/**
 * GET /api/fuel/stats/summary
 * Get fleet fuel statistics
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const { from, to } = req.query;

    // Default to last 7 days
    const startDate = from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = to || new Date().toISOString();

    // Get refueling totals
    const refuelStats = await db('fuel_records')
      .where('record_type', 'refuel')
      .whereBetween('recorded_at', [startDate, endDate])
      .select(
        db.raw('SUM(liters_added) as total_liters'),
        db.raw('SUM(cost) as total_cost'),
        db.raw('COUNT(*) as refuel_count')
      )
      .first();

    // Get daily consumption
    const dailyConsumption = await db('fuel_records')
      .whereBetween('recorded_at', [startDate, endDate])
      .select(
        db.raw("DATE(recorded_at) as date"),
        db.raw('AVG(consumption_rate) as avg_consumption')
      )
      .groupBy(db.raw("DATE(recorded_at)"))
      .orderBy('date');

    // Get per-truck stats
    const truckStats = await db('fuel_records')
      .join('trucks', 'fuel_records.truck_id', 'trucks.id')
      .whereBetween('fuel_records.recorded_at', [startDate, endDate])
      .select(
        'trucks.id',
        db.raw('AVG(fuel_records.consumption_rate) as avg_consumption'),
        db.raw('SUM(CASE WHEN fuel_records.record_type = \'refuel\' THEN fuel_records.liters_added ELSE 0 END) as total_refueled'),
        db.raw('SUM(CASE WHEN fuel_records.record_type = \'refuel\' THEN fuel_records.cost ELSE 0 END) as total_cost')
      )
      .groupBy('trucks.id');

    // Get current fuel levels
    const currentLevels = await db('trucks')
      .whereNot('status', 'inactive')
      .select('id', 'current_fuel_level', 'fuel_capacity');

    const avgFuelLevel = currentLevels.reduce((acc, t) =>
      acc + parseFloat(t.current_fuel_level || 0), 0) / currentLevels.length || 0;

    res.json({
      summary: {
        period: { from: startDate, to: endDate },
        totalLiters: parseFloat(refuelStats.total_liters) || 0,
        totalCost: parseFloat(refuelStats.total_cost) || 0,
        refuelCount: parseInt(refuelStats.refuel_count) || 0,
        avgFuelLevel: avgFuelLevel.toFixed(1),
        lowFuelTrucks: currentLevels.filter(t => parseFloat(t.current_fuel_level) < 30).length
      },
      dailyConsumption,
      truckStats
    });
  } catch (error) {
    console.error('Get fuel stats error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch fuel stats' } });
  }
});

/**
 * GET /api/fuel/stats/weekly
 * Get weekly fuel consumption for charts
 */
router.get('/stats/weekly', async (req, res) => {
  try {
    const weeklyData = await db('fuel_records')
      .where('recorded_at', '>=', db.raw("NOW() - INTERVAL '7 days'"))
      .select(
        db.raw("TO_CHAR(recorded_at, 'Dy') as day"),
        db.raw('SUM(CASE WHEN record_type = \'refuel\' THEN liters_added ELSE 0 END) as consumption'),
        db.raw('SUM(CASE WHEN record_type = \'refuel\' THEN cost ELSE 0 END) as cost')
      )
      .groupBy(db.raw("TO_CHAR(recorded_at, 'Dy')"), db.raw("DATE(recorded_at)"))
      .orderBy(db.raw("DATE(recorded_at)"));

    res.json({ weeklyData });
  } catch (error) {
    console.error('Get weekly fuel stats error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch weekly stats' } });
  }
});

module.exports = router;
