const db = require('../db/connection');
const { emitAlert } = require('./socketService');

/**
 * Check and generate alerts based on truck data
 */
const checkAndGenerateAlerts = async (truckId, data) => {
  const alerts = [];

  // Check for low fuel
  if (data.fuel_level !== undefined && data.fuel_level <= 30) {
    const severity = data.fuel_level <= 15 ? 'critical' : 'warning';
    alerts.push({
      truck_id: truckId,
      type: 'low_fuel',
      title: `Low Fuel Alert - ${truckId}`,
      message: `Fuel level at ${data.fuel_level.toFixed(1)}%. ${severity === 'critical' ? 'Immediate refueling required.' : 'Recommend refueling soon.'}`,
      severity,
      metadata: { fuel_level: data.fuel_level }
    });
  }

  // Check for speed violation (over 120 km/h)
  if (data.speed !== undefined && data.speed > 120) {
    alerts.push({
      truck_id: truckId,
      type: 'speed_violation',
      title: `Speed Alert - ${truckId}`,
      message: `Vehicle exceeding speed limit at ${data.speed} km/h.`,
      severity: data.speed > 140 ? 'critical' : 'warning',
      metadata: { speed: data.speed, latitude: data.latitude, longitude: data.longitude }
    });
  }

  // Check for extended idle time (would need more sophisticated tracking in production)
  if (data.speed !== undefined && data.speed === 0 && data.engine_on) {
    // This is simplified - in production you'd track idle duration
    alerts.push({
      truck_id: truckId,
      type: 'idle_time',
      title: `Idle Alert - ${truckId}`,
      message: `Vehicle is idling. Consider turning off engine to save fuel.`,
      severity: 'info',
      metadata: { latitude: data.latitude, longitude: data.longitude }
    });
  }

  // Save alerts to database and emit via socket
  for (const alertData of alerts) {
    // Check if similar unacknowledged alert exists in last hour
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
};

/**
 * Check for upcoming maintenance
 */
const checkMaintenanceAlerts = async () => {
  const upcomingMaintenance = await db('maintenance_records')
    .join('trucks', 'maintenance_records.truck_id', 'trucks.id')
    .where('maintenance_records.status', 'scheduled')
    .where(function() {
      this.where('scheduled_date', '<=', db.raw("NOW() + INTERVAL '7 days'"))
        .orWhere('next_service_odometer', '<=', db.raw('trucks.odometer + 500'));
    })
    .select('maintenance_records.*', 'trucks.odometer');

  for (const maintenance of upcomingMaintenance) {
    const existingAlert = await db('alerts')
      .where({
        truck_id: maintenance.truck_id,
        type: 'maintenance_due',
        acknowledged: false
      })
      .where('metadata', '@>', JSON.stringify({ maintenance_id: maintenance.id }))
      .first();

    if (!existingAlert) {
      const alert = {
        truck_id: maintenance.truck_id,
        type: 'maintenance_due',
        title: `Maintenance Due - ${maintenance.truck_id}`,
        message: `${maintenance.title} scheduled for ${maintenance.scheduled_date || 'soon'}. ${maintenance.priority === 'critical' ? 'URGENT!' : ''}`,
        severity: maintenance.priority === 'critical' ? 'critical' : 'warning',
        metadata: { maintenance_id: maintenance.id, type: maintenance.type }
      };

      const [newAlert] = await db('alerts')
        .insert(alert)
        .returning('*');

      emitAlert(newAlert);
    }
  }
};

/**
 * Check for expiring driver licenses
 */
const checkLicenseExpiryAlerts = async () => {
  const expiringLicenses = await db('drivers')
    .where('license_expiry', '<=', db.raw("NOW() + INTERVAL '30 days'"))
    .where('status', '!=', 'inactive')
    .select('*');

  for (const driver of expiringLicenses) {
    const existingAlert = await db('alerts')
      .where({
        driver_id: driver.id,
        type: 'license_expiry',
        acknowledged: false
      })
      .first();

    if (!existingAlert) {
      const daysUntilExpiry = Math.ceil((new Date(driver.license_expiry) - new Date()) / (1000 * 60 * 60 * 24));
      const severity = daysUntilExpiry <= 7 ? 'critical' : daysUntilExpiry <= 14 ? 'warning' : 'info';

      const alert = {
        truck_id: driver.assigned_truck_id,
        driver_id: driver.id,
        type: 'license_expiry',
        title: `License Expiring - ${driver.name}`,
        message: `Driver license expires in ${daysUntilExpiry} days (${driver.license_expiry}).`,
        severity,
        metadata: { driver_id: driver.id, expiry_date: driver.license_expiry }
      };

      const [newAlert] = await db('alerts')
        .insert(alert)
        .returning('*');

      emitAlert(newAlert);
    }
  }
};

module.exports = {
  checkAndGenerateAlerts,
  checkMaintenanceAlerts,
  checkLicenseExpiryAlerts
};
