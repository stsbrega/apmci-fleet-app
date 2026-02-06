const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const db = require('../db/connection');
const { handleValidation } = require('../middleware/validation');
const { authenticate, authenticateGpsDevice } = require('../middleware/auth');
const { emitGpsUpdate } = require('../services/socketService');
const { checkAndGenerateAlerts } = require('../services/alertService');

/**
 * POST /api/gps
 * Receive GPS data from hardware device
 * Authenticated via API key
 */
router.post('/', authenticateGpsDevice, [
  body('device_id').optional().trim(),
  body('truck_id').matches(/^TRK-\d{3}$/).withMessage('Invalid truck ID format'),
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  body('speed').optional().isFloat({ min: 0 }).withMessage('Invalid speed'),
  body('heading').optional().isFloat({ min: 0, max: 360 }),
  body('fuel_level').optional().isFloat({ min: 0, max: 100 }),
  body('timestamp').optional().isISO8601(),
  handleValidation
], async (req, res) => {
  try {
    const {
      device_id,
      truck_id,
      latitude,
      longitude,
      speed = 0,
      heading,
      fuel_level,
      city,
      route_info,
      timestamp
    } = req.body;

    // Verify truck exists
    const truck = await db('trucks').where({ id: truck_id }).first();
    if (!truck) {
      return res.status(404).json({ error: { message: 'Truck not found' } });
    }

    // Optionally verify device ID matches
    if (device_id && truck.gps_device_id && truck.gps_device_id !== device_id) {
      return res.status(400).json({ error: { message: 'Device ID mismatch' } });
    }

    // Insert GPS data
    const [gpsRecord] = await db('gps_data')
      .insert({
        truck_id,
        latitude,
        longitude,
        speed,
        heading,
        city,
        route_info,
        recorded_at: timestamp || new Date()
      })
      .returning('*');

    // Update truck status and fuel if moving
    const updateData = {
      current_fuel_level: fuel_level !== undefined ? fuel_level : truck.current_fuel_level
    };

    // Update status based on speed
    if (speed > 0 && truck.status !== 'maintenance') {
      updateData.status = 'active';
    } else if (speed === 0 && truck.status === 'active') {
      updateData.status = 'idle';
    }

    await db('trucks').where({ id: truck_id }).update(updateData);

    // Emit real-time update
    emitGpsUpdate(truck_id, {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      speed: parseFloat(speed),
      heading: heading ? parseFloat(heading) : null,
      city,
      route: route_info,
      fuel_level: fuel_level !== undefined ? parseFloat(fuel_level) : parseFloat(truck.current_fuel_level),
      timestamp: gpsRecord.recorded_at
    });

    // Check for alerts
    await checkAndGenerateAlerts(truck_id, {
      fuel_level: fuel_level !== undefined ? fuel_level : truck.current_fuel_level,
      speed,
      latitude,
      longitude
    });

    res.status(201).json({
      message: 'GPS data recorded',
      record: gpsRecord
    });
  } catch (error) {
    console.error('GPS data error:', error);
    res.status(500).json({ error: { message: 'Failed to record GPS data' } });
  }
});

/**
 * GET /api/gps/:truckId/latest
 * Get latest GPS data for a truck
 */
router.get('/:truckId/latest', authenticate, [
  param('truckId').matches(/^TRK-\d{3}$/).withMessage('Invalid truck ID format'),
  handleValidation
], async (req, res) => {
  try {
    const latestGps = await db('gps_data')
      .where({ truck_id: req.params.truckId })
      .orderBy('recorded_at', 'desc')
      .first();

    if (!latestGps) {
      return res.status(404).json({ error: { message: 'No GPS data found' } });
    }

    res.json({
      location: {
        latitude: parseFloat(latestGps.latitude),
        longitude: parseFloat(latestGps.longitude),
        speed: parseFloat(latestGps.speed),
        heading: latestGps.heading ? parseFloat(latestGps.heading) : null,
        city: latestGps.city,
        route: latestGps.route_info,
        timestamp: latestGps.recorded_at
      }
    });
  } catch (error) {
    console.error('Get GPS error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch GPS data' } });
  }
});

/**
 * GET /api/gps/:truckId/history
 * Get GPS history for a truck
 */
router.get('/:truckId/history', authenticate, [
  param('truckId').matches(/^TRK-\d{3}$/).withMessage('Invalid truck ID format'),
  query('from').optional().isISO8601().withMessage('Invalid from date'),
  query('to').optional().isISO8601().withMessage('Invalid to date'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be 1-1000'),
  handleValidation
], async (req, res) => {
  try {
    const { from, to, limit = 100 } = req.query;

    let query = db('gps_data')
      .where({ truck_id: req.params.truckId })
      .orderBy('recorded_at', 'desc')
      .limit(parseInt(limit));

    if (from) {
      query = query.where('recorded_at', '>=', from);
    }

    if (to) {
      query = query.where('recorded_at', '<=', to);
    }

    const history = await query;

    res.json({
      history: history.map(record => ({
        latitude: parseFloat(record.latitude),
        longitude: parseFloat(record.longitude),
        speed: parseFloat(record.speed),
        heading: record.heading ? parseFloat(record.heading) : null,
        city: record.city,
        route: record.route_info,
        timestamp: record.recorded_at
      }))
    });
  } catch (error) {
    console.error('Get GPS history error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch GPS history' } });
  }
});

/**
 * GET /api/gps/fleet
 * Get latest GPS data for all trucks
 */
router.get('/fleet/current', authenticate, async (req, res) => {
  try {
    // Get all active trucks with their latest GPS
    const trucks = await db('trucks')
      .whereNot('status', 'inactive')
      .select('id', 'status', 'current_fuel_level');

    const fleetLocations = await Promise.all(trucks.map(async (truck) => {
      const latestGps = await db('gps_data')
        .where({ truck_id: truck.id })
        .orderBy('recorded_at', 'desc')
        .first();

      const driver = await db('drivers')
        .where({ assigned_truck_id: truck.id })
        .first();

      return {
        truck_id: truck.id,
        status: truck.status,
        fuel_level: parseFloat(truck.current_fuel_level),
        driver: driver ? driver.name : null,
        location: latestGps ? {
          latitude: parseFloat(latestGps.latitude),
          longitude: parseFloat(latestGps.longitude),
          speed: parseFloat(latestGps.speed),
          heading: latestGps.heading ? parseFloat(latestGps.heading) : null,
          city: latestGps.city,
          route: latestGps.route_info,
          timestamp: latestGps.recorded_at
        } : null
      };
    }));

    res.json({ fleet: fleetLocations });
  } catch (error) {
    console.error('Get fleet GPS error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch fleet GPS data' } });
  }
});

/**
 * POST /api/gps/device/:deviceId
 * Universal endpoint for hardware GPS devices
 * Supports various formats (Teltonika, Queclink, generic)
 * No API key needed - uses device ID for authentication
 */
router.post('/device/:deviceId', [
  param('deviceId').trim().notEmpty().withMessage('Device ID required'),
  handleValidation
], async (req, res) => {
  try {
    const { deviceId } = req.params;
    const data = req.body;

    // Find truck by GPS device ID
    let truck = await db('trucks').where({ gps_device_id: deviceId }).first();

    // If no truck found with this device, check if device ID matches truck ID pattern
    if (!truck && deviceId.match(/^TRK-\d{3}$/)) {
      truck = await db('trucks').where({ id: deviceId }).first();
    }

    if (!truck) {
      // Log unknown device for admin to register
      console.log(`Unknown GPS device: ${deviceId}`, data);
      return res.status(404).json({
        error: {
          message: 'Device not registered',
          device_id: deviceId,
          hint: 'Register this device ID to a truck in the admin panel'
        }
      });
    }

    // Parse different GPS device formats
    let latitude, longitude, speed, heading, fuel_level, timestamp;

    // Teltonika format
    if (data.lat !== undefined && data.lng !== undefined) {
      latitude = parseFloat(data.lat);
      longitude = parseFloat(data.lng);
      speed = parseFloat(data.speed || data.spd || 0);
      heading = parseFloat(data.heading || data.angle || data.course || 0);
      fuel_level = data.fuel !== undefined ? parseFloat(data.fuel) : undefined;
      timestamp = data.timestamp || data.ts || data.datetime;
    }
    // Queclink format
    else if (data.latitude !== undefined) {
      latitude = parseFloat(data.latitude);
      longitude = parseFloat(data.longitude);
      speed = parseFloat(data.speed || 0);
      heading = parseFloat(data.heading || data.bearing || 0);
      fuel_level = data.fuel_level !== undefined ? parseFloat(data.fuel_level) : undefined;
      timestamp = data.timestamp || data.gps_time;
    }
    // Generic/simple format
    else if (data.pos) {
      const parts = data.pos.split(',');
      latitude = parseFloat(parts[0]);
      longitude = parseFloat(parts[1]);
      speed = parts[2] ? parseFloat(parts[2]) : 0;
      heading = parts[3] ? parseFloat(parts[3]) : 0;
    }
    // Raw coordinate format: lat,lng
    else if (typeof data === 'string' && data.includes(',')) {
      const parts = data.split(',');
      latitude = parseFloat(parts[0]);
      longitude = parseFloat(parts[1]);
      speed = 0;
      heading = 0;
    }
    else {
      return res.status(400).json({
        error: {
          message: 'Unrecognized data format',
          received: data,
          supported_formats: [
            '{ lat, lng, speed, heading }',
            '{ latitude, longitude, speed }',
            '{ pos: "lat,lng,speed,heading" }'
          ]
        }
      });
    }

    // Validate coordinates
    if (isNaN(latitude) || isNaN(longitude) ||
        latitude < -90 || latitude > 90 ||
        longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: { message: 'Invalid coordinates' } });
    }

    // Insert GPS data
    const [gpsRecord] = await db('gps_data')
      .insert({
        truck_id: truck.id,
        latitude,
        longitude,
        speed: speed || 0,
        heading: heading || 0,
        recorded_at: timestamp ? new Date(timestamp) : new Date()
      })
      .returning('*');

    // Update truck
    const updateData = {};
    if (fuel_level !== undefined) {
      updateData.current_fuel_level = fuel_level;
    }
    if (speed > 0 && truck.status !== 'maintenance') {
      updateData.status = 'active';
    } else if (speed === 0 && truck.status === 'active') {
      updateData.status = 'idle';
    }

    if (Object.keys(updateData).length > 0) {
      await db('trucks').where({ id: truck.id }).update(updateData);
    }

    // Emit real-time update
    emitGpsUpdate(truck.id, {
      latitude,
      longitude,
      speed: speed || 0,
      heading: heading || 0,
      fuel_level: fuel_level !== undefined ? fuel_level : parseFloat(truck.current_fuel_level),
      timestamp: gpsRecord.recorded_at
    });

    // Check for alerts
    await checkAndGenerateAlerts(truck.id, {
      fuel_level: fuel_level !== undefined ? fuel_level : truck.current_fuel_level,
      speed: speed || 0,
      latitude,
      longitude
    });

    // Return minimal response for bandwidth efficiency
    res.status(200).send('OK');
  } catch (error) {
    console.error('Device GPS error:', error);
    res.status(500).send('ERROR');
  }
});

/**
 * GET /api/gps/device/:deviceId/config
 * Return device configuration info
 */
router.get('/device/:deviceId/config', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const truck = await db('trucks').where({ gps_device_id: deviceId }).first();

    if (!truck) {
      return res.status(404).json({ registered: false, device_id: deviceId });
    }

    res.json({
      registered: true,
      device_id: deviceId,
      truck_id: truck.id,
      update_interval: 10 // seconds
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
