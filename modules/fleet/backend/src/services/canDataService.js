/**
 * CAN Data Service
 *
 * Handles CAN bus data processing, alert generation, and analytics
 * for Teltonika FMC150 devices connected to vehicle OBD-II/CAN ports.
 */

const db = require('../db/connection');
const { emitAlert } = require('./socketService');

// CAN-based alert thresholds
const CAN_ALERT_THRESHOLDS = {
  engine_coolant_temp_warning: 100,   // Celsius
  engine_coolant_temp_critical: 110,  // Celsius
  engine_rpm_high: 3500,              // RPM
  engine_oil_pressure_low: 100,       // kPa
  battery_voltage_low: 11.5,          // Volts
  battery_voltage_high: 15.0,         // Volts
};

/**
 * Process CAN data and generate alerts when thresholds are exceeded
 */
async function processCanAlerts(truckId, canData) {
  const alerts = [];

  // Engine overheat warning
  if (canData.engine_coolant_temp !== undefined) {
    if (canData.engine_coolant_temp >= CAN_ALERT_THRESHOLDS.engine_coolant_temp_critical) {
      alerts.push({
        truck_id: truckId,
        type: 'engine_warning',
        title: `Engine Overheat - ${truckId}`,
        message: `Engine coolant temperature at ${canData.engine_coolant_temp}°C. STOP VEHICLE IMMEDIATELY.`,
        severity: 'critical',
        metadata: {
          engine_coolant_temp: canData.engine_coolant_temp,
          source: 'can_bus'
        }
      });
    } else if (canData.engine_coolant_temp >= CAN_ALERT_THRESHOLDS.engine_coolant_temp_warning) {
      alerts.push({
        truck_id: truckId,
        type: 'engine_warning',
        title: `High Engine Temp - ${truckId}`,
        message: `Engine coolant temperature at ${canData.engine_coolant_temp}°C. Monitor closely.`,
        severity: 'warning',
        metadata: {
          engine_coolant_temp: canData.engine_coolant_temp,
          source: 'can_bus'
        }
      });
    }
  }

  // High RPM alert
  if (canData.engine_rpm !== undefined && canData.engine_rpm > CAN_ALERT_THRESHOLDS.engine_rpm_high) {
    alerts.push({
      truck_id: truckId,
      type: 'engine_warning',
      title: `High RPM Alert - ${truckId}`,
      message: `Engine RPM at ${canData.engine_rpm}. Excessive engine stress detected.`,
      severity: 'warning',
      metadata: {
        engine_rpm: canData.engine_rpm,
        source: 'can_bus'
      }
    });
  }

  // Low oil pressure
  if (canData.engine_oil_pressure !== undefined &&
      canData.engine_oil_pressure < CAN_ALERT_THRESHOLDS.engine_oil_pressure_low &&
      canData.engine_oil_pressure > 0) {
    alerts.push({
      truck_id: truckId,
      type: 'engine_warning',
      title: `Low Oil Pressure - ${truckId}`,
      message: `Engine oil pressure at ${canData.engine_oil_pressure} kPa. Check oil level immediately.`,
      severity: 'critical',
      metadata: {
        engine_oil_pressure: canData.engine_oil_pressure,
        source: 'can_bus'
      }
    });
  }

  // Battery voltage issues
  if (canData.battery_voltage !== undefined) {
    if (canData.battery_voltage < CAN_ALERT_THRESHOLDS.battery_voltage_low) {
      alerts.push({
        truck_id: truckId,
        type: 'engine_warning',
        title: `Low Battery Voltage - ${truckId}`,
        message: `Battery voltage at ${canData.battery_voltage.toFixed(1)}V. Check alternator and battery.`,
        severity: 'warning',
        metadata: {
          battery_voltage: canData.battery_voltage,
          source: 'can_bus'
        }
      });
    } else if (canData.battery_voltage > CAN_ALERT_THRESHOLDS.battery_voltage_high) {
      alerts.push({
        truck_id: truckId,
        type: 'engine_warning',
        title: `High Battery Voltage - ${truckId}`,
        message: `Battery voltage at ${canData.battery_voltage.toFixed(1)}V. Possible overcharging.`,
        severity: 'warning',
        metadata: {
          battery_voltage: canData.battery_voltage,
          source: 'can_bus'
        }
      });
    }
  }

  // DTC (Diagnostic Trouble Code) alert
  if (canData.dtc_count !== undefined && canData.dtc_count > 0) {
    alerts.push({
      truck_id: truckId,
      type: 'engine_warning',
      title: `Diagnostic Codes Detected - ${truckId}`,
      message: `${canData.dtc_count} active diagnostic trouble code(s) detected. Schedule diagnostics.`,
      severity: canData.dtc_count > 3 ? 'critical' : 'warning',
      metadata: {
        dtc_count: canData.dtc_count,
        source: 'can_bus'
      }
    });
  }

  // CAN fuel level alert (more accurate than analog)
  if (canData.fuel_level_can !== undefined && canData.fuel_level_can <= 30) {
    const severity = canData.fuel_level_can <= 15 ? 'critical' : 'warning';
    alerts.push({
      truck_id: truckId,
      type: 'low_fuel',
      title: `Low Fuel (CAN) - ${truckId}`,
      message: `CAN bus fuel level at ${canData.fuel_level_can.toFixed(1)}%. ${severity === 'critical' ? 'Immediate refueling required.' : 'Recommend refueling soon.'}`,
      severity,
      metadata: {
        fuel_level: canData.fuel_level_can,
        source: 'can_bus'
      }
    });
  }

  // Save alerts with deduplication
  for (const alertData of alerts) {
    const existingAlert = await db('alerts')
      .where({
        truck_id: alertData.truck_id,
        type: alertData.type,
        acknowledged: false
      })
      .where('created_at', '>', db.raw("NOW() - INTERVAL '1 hour'"))
      .first();

    if (!existingAlert) {
      const [newAlert] = await db('alerts')
        .insert(alertData)
        .returning('*');
      emitAlert(newAlert);
    }
  }

  return alerts;
}

/**
 * Get latest CAN data snapshot for a truck
 */
async function getLatestCanData(truckId) {
  return db('can_data')
    .where({ truck_id: truckId })
    .orderBy('recorded_at', 'desc')
    .first();
}

/**
 * Get CAN data history for a truck with optional date filtering
 */
async function getCanHistory(truckId, { from, to, limit = 100 } = {}) {
  let query = db('can_data')
    .where({ truck_id: truckId })
    .orderBy('recorded_at', 'desc')
    .limit(parseInt(limit));

  if (from) query = query.where('recorded_at', '>=', from);
  if (to) query = query.where('recorded_at', '<=', to);

  return query;
}

/**
 * Get CAN data summary/statistics for a truck
 */
async function getCanStats(truckId, hours = 24) {
  const result = await db('can_data')
    .where({ truck_id: truckId })
    .where('recorded_at', '>', db.raw(`NOW() - INTERVAL '${parseInt(hours)} hours'`))
    .select(
      db.raw('AVG(engine_rpm) as avg_rpm'),
      db.raw('MAX(engine_rpm) as max_rpm'),
      db.raw('AVG(engine_coolant_temp) as avg_coolant_temp'),
      db.raw('MAX(engine_coolant_temp) as max_coolant_temp'),
      db.raw('AVG(engine_load) as avg_engine_load'),
      db.raw('MAX(engine_load) as max_engine_load'),
      db.raw('AVG(fuel_rate) as avg_fuel_rate'),
      db.raw('AVG(vehicle_speed_can) as avg_speed'),
      db.raw('MAX(vehicle_speed_can) as max_speed'),
      db.raw('AVG(battery_voltage) as avg_battery_voltage'),
      db.raw('MIN(battery_voltage) as min_battery_voltage'),
      db.raw('MAX(total_distance) - MIN(total_distance) as distance_covered'),
      db.raw('MAX(total_fuel_used) - MIN(total_fuel_used) as fuel_consumed'),
      db.raw('COUNT(*) as record_count')
    )
    .first();

  return result;
}

/**
 * Get fleet-wide CAN data summary
 */
async function getFleetCanSummary() {
  const trucks = await db('trucks')
    .whereNot('status', 'inactive')
    .select('id', 'status', 'gps_device_imei', 'gps_device_model');

  const fleetData = await Promise.all(trucks.map(async (truck) => {
    const latest = await getLatestCanData(truck.id);
    return {
      truck_id: truck.id,
      status: truck.status,
      device_model: truck.gps_device_model,
      device_imei: truck.gps_device_imei,
      can_data: latest ? {
        engine_rpm: latest.engine_rpm,
        engine_coolant_temp: latest.engine_coolant_temp ? parseFloat(latest.engine_coolant_temp) : null,
        engine_load: latest.engine_load ? parseFloat(latest.engine_load) : null,
        fuel_level_can: latest.fuel_level_can ? parseFloat(latest.fuel_level_can) : null,
        fuel_rate: latest.fuel_rate ? parseFloat(latest.fuel_rate) : null,
        vehicle_speed_can: latest.vehicle_speed_can ? parseFloat(latest.vehicle_speed_can) : null,
        battery_voltage: latest.battery_voltage ? parseFloat(latest.battery_voltage) : null,
        total_distance: latest.total_distance ? parseFloat(latest.total_distance) : null,
        dtc_count: latest.dtc_count || 0,
        recorded_at: latest.recorded_at
      } : null
    };
  }));

  return fleetData;
}

module.exports = {
  processCanAlerts,
  getLatestCanData,
  getCanHistory,
  getCanStats,
  getFleetCanSummary,
  CAN_ALERT_THRESHOLDS
};
