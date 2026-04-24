const express = require('express');
const pool = require('../db');
const router = express.Router();

// Get all waitlist entries
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM waitlist ORDER BY created_at ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single entry
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM waitlist WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Entry not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create waitlist entry
router.post('/', async (req, res) => {
  try {
    const { first_name, last_name, email, phone, desired_unit_type, desired_size_sqft, climate_controlled, max_budget, notes, status } = req.body;
    const result = await pool.query(
      `INSERT INTO waitlist (first_name, last_name, email, phone, desired_unit_type, desired_size_sqft, climate_controlled, max_budget, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [first_name, last_name, email, phone, desired_unit_type, desired_size_sqft, climate_controlled, max_budget, notes, status || 'waiting']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update waitlist entry
router.put('/:id', async (req, res) => {
  try {
    const { first_name, last_name, email, phone, desired_unit_type, desired_size_sqft, climate_controlled, max_budget, notes, status, notified_date } = req.body;
    const result = await pool.query(
      `UPDATE waitlist SET first_name=$1, last_name=$2, email=$3, phone=$4, desired_unit_type=$5,
       desired_size_sqft=$6, climate_controlled=$7, max_budget=$8, notes=$9, status=$10, notified_date=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [first_name, last_name, email, phone, desired_unit_type, desired_size_sqft, climate_controlled, max_budget, notes, status, notified_date, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Entry not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete waitlist entry
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM waitlist WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Entry not found' });
    res.json({ message: 'Entry deleted', entry: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
