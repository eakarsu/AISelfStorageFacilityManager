const express = require('express');
const pool = require('../db');
const router = express.Router();

// Get all units
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM storage_units ORDER BY unit_number');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single unit
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM storage_units WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Unit not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create unit
router.post('/', async (req, res) => {
  try {
    const { unit_number, size_sqft, unit_type, climate_controlled, floor_level, monthly_rate, status } = req.body;
    const result = await pool.query(
      `INSERT INTO storage_units (unit_number, size_sqft, unit_type, climate_controlled, floor_level, monthly_rate, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [unit_number, size_sqft, unit_type, climate_controlled, floor_level, monthly_rate, status || 'available']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update unit
router.put('/:id', async (req, res) => {
  try {
    const { unit_number, size_sqft, unit_type, climate_controlled, floor_level, monthly_rate, status } = req.body;
    const result = await pool.query(
      `UPDATE storage_units SET unit_number=$1, size_sqft=$2, unit_type=$3, climate_controlled=$4, floor_level=$5, monthly_rate=$6, status=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [unit_number, size_sqft, unit_type, climate_controlled, floor_level, monthly_rate, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Unit not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete unit
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM storage_units WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Unit not found' });
    res.json({ message: 'Unit deleted', unit: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
