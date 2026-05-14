const express = require('express');
const pool = require('../db');
const router = express.Router();
const auth = require('../middleware/auth');
router.use(auth);

// Get all notifications
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate alerts from current data (auto-detect issues)
router.post('/generate', async (req, res) => {
  try {
    const alerts = [];

    // 1. Overdue billing
    const overdue = await pool.query(`
      SELECT tenant_name, unit_number, amount, due_date
      FROM billing_records
      WHERE status = 'overdue'
    `);
    for (const row of overdue.rows) {
      alerts.push({
        type: 'overdue_payment',
        severity: 'high',
        title: `Overdue Payment - ${row.tenant_name}`,
        message: `${row.tenant_name} has an overdue payment of $${row.amount} for unit ${row.unit_number} (due ${new Date(row.due_date).toLocaleDateString()})`,
        related_entity: 'billing',
        related_id: row.unit_number
      });
    }

    // 2. Expiring leases (within 30 days)
    const expiringLeases = await pool.query(`
      SELECT first_name, last_name, unit_number, lease_end
      FROM tenants
      WHERE lease_end IS NOT NULL
        AND lease_end BETWEEN NOW() AND NOW() + INTERVAL '30 days'
    `);
    for (const row of expiringLeases.rows) {
      alerts.push({
        type: 'lease_expiring',
        severity: 'medium',
        title: `Lease Expiring - ${row.first_name} ${row.last_name}`,
        message: `${row.first_name} ${row.last_name}'s lease for unit ${row.unit_number} expires on ${new Date(row.lease_end).toLocaleDateString()}`,
        related_entity: 'tenants',
        related_id: row.unit_number
      });
    }

    // 3. Expired leases
    const expiredLeases = await pool.query(`
      SELECT first_name, last_name, unit_number, lease_end
      FROM tenants
      WHERE lease_end IS NOT NULL AND lease_end < NOW()
    `);
    for (const row of expiredLeases.rows) {
      alerts.push({
        type: 'lease_expired',
        severity: 'high',
        title: `Lease Expired - ${row.first_name} ${row.last_name}`,
        message: `${row.first_name} ${row.last_name}'s lease for unit ${row.unit_number} expired on ${new Date(row.lease_end).toLocaleDateString()}`,
        related_entity: 'tenants',
        related_id: row.unit_number
      });
    }

    // 4. Unresolved security events (critical/high)
    const unresolvedSecurity = await pool.query(`
      SELECT event_type, location, severity, description
      FROM security_events
      WHERE resolved = false AND severity IN ('critical', 'high')
    `);
    for (const row of unresolvedSecurity.rows) {
      alerts.push({
        type: 'security_alert',
        severity: row.severity === 'critical' ? 'critical' : 'high',
        title: `Unresolved Security - ${row.event_type.replace(/_/g, ' ')}`,
        message: `${row.description} at ${row.location}`,
        related_entity: 'security',
        related_id: row.location
      });
    }

    // 5. Urgent maintenance requests still open
    const urgentMaintenance = await pool.query(`
      SELECT title, location, priority, status
      FROM maintenance_requests
      WHERE priority IN ('urgent', 'high') AND status NOT IN ('completed')
    `);
    for (const row of urgentMaintenance.rows) {
      alerts.push({
        type: 'maintenance_urgent',
        severity: row.priority === 'urgent' ? 'high' : 'medium',
        title: `Maintenance: ${row.title}`,
        message: `${row.title} at ${row.location} - Status: ${row.status}`,
        related_entity: 'maintenance',
        related_id: row.location
      });
    }

    // 6. Expired insurance policies
    const expiredInsurance = await pool.query(`
      SELECT tenant_name, unit_number, policy_number, end_date
      FROM insurance_policies
      WHERE status = 'expired' OR end_date < NOW()
    `);
    for (const row of expiredInsurance.rows) {
      alerts.push({
        type: 'insurance_expired',
        severity: 'medium',
        title: `Insurance Expired - ${row.tenant_name}`,
        message: `${row.tenant_name}'s insurance policy ${row.policy_number} for unit ${row.unit_number} has expired`,
        related_entity: 'insurance',
        related_id: row.unit_number
      });
    }

    // 7. Unverified tenant IDs
    const unverifiedTenants = await pool.query(`
      SELECT first_name, last_name, unit_number
      FROM tenants
      WHERE id_verified = false
    `);
    for (const row of unverifiedTenants.rows) {
      alerts.push({
        type: 'id_unverified',
        severity: 'low',
        title: `ID Not Verified - ${row.first_name} ${row.last_name}`,
        message: `${row.first_name} ${row.last_name} (unit ${row.unit_number}) has not completed ID verification`,
        related_entity: 'tenants',
        related_id: row.unit_number
      });
    }

    // Insert new alerts (clear old generated ones first)
    await pool.query(`DELETE FROM notifications WHERE is_auto_generated = true`);
    for (const alert of alerts) {
      await pool.query(
        `INSERT INTO notifications (type, severity, title, message, related_entity, related_id, is_auto_generated)
         VALUES ($1, $2, $3, $4, $5, $6, true)`,
        [alert.type, alert.severity, alert.title, alert.message, alert.related_entity, alert.related_id]
      );
    }

    const result = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE notifications SET is_read = true, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Notification not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark all as read
router.put('/mark-all-read', async (req, res) => {
  try {
    await pool.query(`UPDATE notifications SET is_read = true, updated_at = NOW() WHERE is_read = false`);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM notifications WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Notification not found' });
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
