const express = require('express');
const pool = require('../db');
const router = express.Router();

// Revenue summary by month
router.get('/revenue-summary', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT period_month, period_year, category,
        COUNT(*) as transaction_count,
        SUM(amount) as total_amount
      FROM revenue_records
      GROUP BY period_year, period_month, category
      ORDER BY period_year DESC, period_month DESC, category
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Occupancy summary
router.get('/occupancy-summary', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_units,
        COUNT(*) FILTER (WHERE status = 'occupied') as occupied,
        COUNT(*) FILTER (WHERE status = 'available') as available,
        COUNT(*) FILTER (WHERE status = 'reserved') as reserved,
        ROUND(COUNT(*) FILTER (WHERE status = 'occupied') * 100.0 / NULLIF(COUNT(*), 0), 1) as occupancy_rate
      FROM storage_units
    `);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Occupancy by unit type
router.get('/occupancy-by-type', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT unit_type,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'occupied') as occupied,
        COUNT(*) FILTER (WHERE status = 'available') as available,
        COUNT(*) FILTER (WHERE status = 'reserved') as reserved,
        ROUND(COUNT(*) FILTER (WHERE status = 'occupied') * 100.0 / NULLIF(COUNT(*), 0), 1) as occupancy_rate
      FROM storage_units
      GROUP BY unit_type
      ORDER BY unit_type
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Payment status breakdown
router.get('/payment-status', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT status,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM billing_records
      GROUP BY status
      ORDER BY status
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Maintenance summary
router.get('/maintenance-summary', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT status, priority,
        COUNT(*) as count,
        SUM(estimated_cost) as total_cost
      FROM maintenance_requests
      GROUP BY status, priority
      ORDER BY status, priority
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Revenue by category totals
router.get('/revenue-by-category', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT category,
        COUNT(*) as transaction_count,
        SUM(amount) as total_amount,
        ROUND(AVG(amount), 2) as avg_amount
      FROM revenue_records
      GROUP BY category
      ORDER BY total_amount DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lease expiration report
router.get('/lease-expirations', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT first_name, last_name, email, phone, unit_number, lease_start, lease_end,
        CASE
          WHEN lease_end < NOW() THEN 'expired'
          WHEN lease_end < NOW() + INTERVAL '30 days' THEN 'expiring_soon'
          WHEN lease_end < NOW() + INTERVAL '90 days' THEN 'upcoming'
          ELSE 'active'
        END as lease_status
      FROM tenants
      WHERE lease_end IS NOT NULL
      ORDER BY lease_end ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
