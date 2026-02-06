const express = require('express');
const router = express.Router();
const { param, query } = require('express-validator');
const db = require('../db/connection');
const { handleValidation } = require('../middleware/validation');
const { authenticate, authorize } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticate);

/**
 * GET /api/alerts
 * Get all alerts
 */
router.get('/', async (req, res) => {
  try {
    const { truck_id, severity, acknowledged, type, limit = 50 } = req.query;

    let query = db('alerts')
      .leftJoin('trucks', 'alerts.truck_id', 'trucks.id')
      .leftJoin('drivers', 'alerts.driver_id', 'drivers.id')
      .select(
        'alerts.*',
        'trucks.plate_number',
        'drivers.name as driver_name'
      );

    if (truck_id) {
      query = query.where('alerts.truck_id', truck_id);
    }

    if (severity) {
      query = query.where('alerts.severity', severity);
    }

    if (acknowledged !== undefined) {
      query = query.where('alerts.acknowledged', acknowledged === 'true');
    }

    if (type) {
      query = query.where('alerts.type', type);
    }

    const alerts = await query
      .orderBy('alerts.created_at', 'desc')
      .limit(parseInt(limit));

    res.json({ alerts });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch alerts' } });
  }
});

/**
 * GET /api/alerts/active
 * Get active (unacknowledged) alerts
 */
router.get('/active', async (req, res) => {
  try {
    const alerts = await db('alerts')
      .leftJoin('trucks', 'alerts.truck_id', 'trucks.id')
      .leftJoin('drivers', 'alerts.driver_id', 'drivers.id')
      .where('alerts.acknowledged', false)
      .select(
        'alerts.*',
        'trucks.plate_number',
        'drivers.name as driver_name'
      )
      .orderBy([
        { column: 'alerts.severity', order: 'desc' },
        { column: 'alerts.created_at', order: 'desc' }
      ])
      .limit(100);

    // Count by severity
    const counts = {
      critical: alerts.filter(a => a.severity === 'critical').length,
      warning: alerts.filter(a => a.severity === 'warning').length,
      info: alerts.filter(a => a.severity === 'info').length,
      total: alerts.length
    };

    res.json({ alerts, counts });
  } catch (error) {
    console.error('Get active alerts error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch active alerts' } });
  }
});

/**
 * GET /api/alerts/:id
 * Get single alert
 */
router.get('/:id', [
  param('id').isInt().withMessage('Invalid alert ID'),
  handleValidation
], async (req, res) => {
  try {
    const alert = await db('alerts')
      .leftJoin('trucks', 'alerts.truck_id', 'trucks.id')
      .leftJoin('drivers', 'alerts.driver_id', 'drivers.id')
      .leftJoin('users', 'alerts.acknowledged_by', 'users.id')
      .where('alerts.id', req.params.id)
      .select(
        'alerts.*',
        'trucks.plate_number',
        'trucks.make',
        'trucks.model',
        'drivers.name as driver_name',
        'users.name as acknowledged_by_name'
      )
      .first();

    if (!alert) {
      return res.status(404).json({ error: { message: 'Alert not found' } });
    }

    res.json({ alert });
  } catch (error) {
    console.error('Get alert error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch alert' } });
  }
});

/**
 * PUT /api/alerts/:id/acknowledge
 * Acknowledge an alert
 */
router.put('/:id/acknowledge', [
  param('id').isInt().withMessage('Invalid alert ID'),
  handleValidation
], async (req, res) => {
  try {
    const alert = await db('alerts').where({ id: req.params.id }).first();
    if (!alert) {
      return res.status(404).json({ error: { message: 'Alert not found' } });
    }

    if (alert.acknowledged) {
      return res.status(400).json({ error: { message: 'Alert already acknowledged' } });
    }

    const [updatedAlert] = await db('alerts')
      .where({ id: req.params.id })
      .update({
        acknowledged: true,
        acknowledged_by: req.user.id,
        acknowledged_at: new Date()
      })
      .returning('*');

    res.json({ message: 'Alert acknowledged', alert: updatedAlert });
  } catch (error) {
    console.error('Acknowledge alert error:', error);
    res.status(500).json({ error: { message: 'Failed to acknowledge alert' } });
  }
});

/**
 * PUT /api/alerts/acknowledge-all
 * Acknowledge multiple alerts
 */
router.put('/acknowledge-all', async (req, res) => {
  try {
    const { ids, truck_id, severity } = req.body;

    let query = db('alerts').where('acknowledged', false);

    if (ids && Array.isArray(ids)) {
      query = query.whereIn('id', ids);
    }

    if (truck_id) {
      query = query.where('truck_id', truck_id);
    }

    if (severity) {
      query = query.where('severity', severity);
    }

    const count = await query.update({
      acknowledged: true,
      acknowledged_by: req.user.id,
      acknowledged_at: new Date()
    });

    res.json({ message: `${count} alerts acknowledged` });
  } catch (error) {
    console.error('Acknowledge all alerts error:', error);
    res.status(500).json({ error: { message: 'Failed to acknowledge alerts' } });
  }
});

/**
 * DELETE /api/alerts/:id
 * Delete an alert
 */
router.delete('/:id', authorize('admin'), [
  param('id').isInt().withMessage('Invalid alert ID'),
  handleValidation
], async (req, res) => {
  try {
    const alert = await db('alerts').where({ id: req.params.id }).first();
    if (!alert) {
      return res.status(404).json({ error: { message: 'Alert not found' } });
    }

    await db('alerts').where({ id: req.params.id }).delete();

    res.json({ message: 'Alert deleted' });
  } catch (error) {
    console.error('Delete alert error:', error);
    res.status(500).json({ error: { message: 'Failed to delete alert' } });
  }
});

/**
 * GET /api/alerts/stats/summary
 * Get alert statistics
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const stats = await db('alerts')
      .where('created_at', '>=', db.raw(`NOW() - INTERVAL '${parseInt(days)} days'`))
      .select(
        db.raw('COUNT(*) as total'),
        db.raw('COUNT(*) FILTER (WHERE severity = \'critical\') as critical'),
        db.raw('COUNT(*) FILTER (WHERE severity = \'warning\') as warning'),
        db.raw('COUNT(*) FILTER (WHERE severity = \'info\') as info'),
        db.raw('COUNT(*) FILTER (WHERE acknowledged = true) as acknowledged'),
        db.raw('COUNT(*) FILTER (WHERE acknowledged = false) as unacknowledged')
      )
      .first();

    // Get alerts by type
    const byType = await db('alerts')
      .where('created_at', '>=', db.raw(`NOW() - INTERVAL '${parseInt(days)} days'`))
      .select('type')
      .count('* as count')
      .groupBy('type')
      .orderBy('count', 'desc');

    // Get daily alert counts
    const daily = await db('alerts')
      .where('created_at', '>=', db.raw(`NOW() - INTERVAL '${parseInt(days)} days'`))
      .select(
        db.raw('DATE(created_at) as date'),
        db.raw('COUNT(*) as count')
      )
      .groupBy(db.raw('DATE(created_at)'))
      .orderBy('date');

    res.json({
      stats: {
        total: parseInt(stats.total) || 0,
        critical: parseInt(stats.critical) || 0,
        warning: parseInt(stats.warning) || 0,
        info: parseInt(stats.info) || 0,
        acknowledged: parseInt(stats.acknowledged) || 0,
        unacknowledged: parseInt(stats.unacknowledged) || 0
      },
      byType,
      daily
    });
  } catch (error) {
    console.error('Get alert stats error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch alert stats' } });
  }
});

module.exports = router;
