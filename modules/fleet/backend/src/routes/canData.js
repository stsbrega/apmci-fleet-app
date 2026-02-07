const express = require('express');
const router = express.Router();
const { param, query } = require('express-validator');
const { handleValidation } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const {
  getLatestCanData,
  getCanHistory,
  getCanStats,
  getFleetCanSummary
} = require('../services/canDataService');
const { getConnectedDevices } = require('../services/teltonikaTcpServer');

/**
 * GET /api/can/:truckId/latest
 * Get latest CAN bus data for a truck
 */
router.get('/:truckId/latest', authenticate, [
  param('truckId').matches(/^TRK-\d{3}$/).withMessage('Invalid truck ID format'),
  handleValidation
], async (req, res) => {
  try {
    const data = await getLatestCanData(req.params.truckId);

    if (!data) {
      return res.status(404).json({ error: { message: 'No CAN data found for this truck' } });
    }

    res.json({
      truck_id: req.params.truckId,
      can_data: {
        engine_rpm: data.engine_rpm,
        engine_coolant_temp: data.engine_coolant_temp ? parseFloat(data.engine_coolant_temp) : null,
        engine_load: data.engine_load ? parseFloat(data.engine_load) : null,
        engine_total_hours: data.engine_total_hours,
        fuel_level_can: data.fuel_level_can ? parseFloat(data.fuel_level_can) : null,
        fuel_rate: data.fuel_rate ? parseFloat(data.fuel_rate) : null,
        total_fuel_used: data.total_fuel_used ? parseFloat(data.total_fuel_used) : null,
        vehicle_speed_can: data.vehicle_speed_can ? parseFloat(data.vehicle_speed_can) : null,
        accelerator_pedal_pos: data.accelerator_pedal_pos ? parseFloat(data.accelerator_pedal_pos) : null,
        total_distance: data.total_distance ? parseFloat(data.total_distance) : null,
        battery_voltage: data.battery_voltage ? parseFloat(data.battery_voltage) : null,
        intake_air_temp: data.intake_air_temp ? parseFloat(data.intake_air_temp) : null,
        intake_manifold_pressure: data.intake_manifold_pressure ? parseFloat(data.intake_manifold_pressure) : null,
        engine_oil_pressure: data.engine_oil_pressure ? parseFloat(data.engine_oil_pressure) : null,
        ambient_air_temp: data.ambient_air_temp ? parseFloat(data.ambient_air_temp) : null,
        dtc_count: data.dtc_count || 0,
        recorded_at: data.recorded_at
      }
    });
  } catch (error) {
    console.error('Get CAN data error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch CAN data' } });
  }
});

/**
 * GET /api/can/:truckId/history
 * Get CAN data history for a truck
 */
router.get('/:truckId/history', authenticate, [
  param('truckId').matches(/^TRK-\d{3}$/).withMessage('Invalid truck ID format'),
  query('from').optional().isISO8601().withMessage('Invalid from date'),
  query('to').optional().isISO8601().withMessage('Invalid to date'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be 1-1000'),
  handleValidation
], async (req, res) => {
  try {
    const { from, to, limit } = req.query;
    const history = await getCanHistory(req.params.truckId, { from, to, limit });

    res.json({
      truck_id: req.params.truckId,
      count: history.length,
      history: history.map(record => ({
        engine_rpm: record.engine_rpm,
        engine_coolant_temp: record.engine_coolant_temp ? parseFloat(record.engine_coolant_temp) : null,
        engine_load: record.engine_load ? parseFloat(record.engine_load) : null,
        fuel_level_can: record.fuel_level_can ? parseFloat(record.fuel_level_can) : null,
        fuel_rate: record.fuel_rate ? parseFloat(record.fuel_rate) : null,
        vehicle_speed_can: record.vehicle_speed_can ? parseFloat(record.vehicle_speed_can) : null,
        battery_voltage: record.battery_voltage ? parseFloat(record.battery_voltage) : null,
        total_distance: record.total_distance ? parseFloat(record.total_distance) : null,
        dtc_count: record.dtc_count || 0,
        recorded_at: record.recorded_at
      }))
    });
  } catch (error) {
    console.error('Get CAN history error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch CAN history' } });
  }
});

/**
 * GET /api/can/:truckId/stats
 * Get CAN data statistics for a truck over a time period
 */
router.get('/:truckId/stats', authenticate, [
  param('truckId').matches(/^TRK-\d{3}$/).withMessage('Invalid truck ID format'),
  query('hours').optional().isInt({ min: 1, max: 720 }).withMessage('Hours must be 1-720'),
  handleValidation
], async (req, res) => {
  try {
    const hours = req.query.hours || 24;
    const stats = await getCanStats(req.params.truckId, hours);

    res.json({
      truck_id: req.params.truckId,
      period_hours: parseInt(hours),
      stats: {
        avg_rpm: stats.avg_rpm ? Math.round(parseFloat(stats.avg_rpm)) : null,
        max_rpm: stats.max_rpm || null,
        avg_coolant_temp: stats.avg_coolant_temp ? parseFloat(parseFloat(stats.avg_coolant_temp).toFixed(1)) : null,
        max_coolant_temp: stats.max_coolant_temp ? parseFloat(stats.max_coolant_temp) : null,
        avg_engine_load: stats.avg_engine_load ? parseFloat(parseFloat(stats.avg_engine_load).toFixed(1)) : null,
        max_engine_load: stats.max_engine_load ? parseFloat(stats.max_engine_load) : null,
        avg_fuel_rate: stats.avg_fuel_rate ? parseFloat(parseFloat(stats.avg_fuel_rate).toFixed(2)) : null,
        avg_speed: stats.avg_speed ? parseFloat(parseFloat(stats.avg_speed).toFixed(1)) : null,
        max_speed: stats.max_speed ? parseFloat(stats.max_speed) : null,
        avg_battery_voltage: stats.avg_battery_voltage ? parseFloat(parseFloat(stats.avg_battery_voltage).toFixed(2)) : null,
        min_battery_voltage: stats.min_battery_voltage ? parseFloat(stats.min_battery_voltage) : null,
        distance_covered_km: stats.distance_covered ? parseFloat(parseFloat(stats.distance_covered).toFixed(1)) : null,
        fuel_consumed_l: stats.fuel_consumed ? parseFloat(parseFloat(stats.fuel_consumed).toFixed(1)) : null,
        record_count: parseInt(stats.record_count) || 0
      }
    });
  } catch (error) {
    console.error('Get CAN stats error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch CAN statistics' } });
  }
});

/**
 * GET /api/can/fleet/summary
 * Get CAN data summary for all fleet vehicles
 */
router.get('/fleet/summary', authenticate, async (req, res) => {
  try {
    const fleetData = await getFleetCanSummary();

    res.json({
      fleet: fleetData,
      connected_devices: getConnectedDevices()
    });
  } catch (error) {
    console.error('Get fleet CAN summary error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch fleet CAN summary' } });
  }
});

module.exports = router;
