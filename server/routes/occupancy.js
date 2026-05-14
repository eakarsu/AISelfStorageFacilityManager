const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM occupancy_forecasts ORDER BY forecast_date');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM occupancy_forecasts WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Forecast not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { forecast_date, predicted_occupancy, actual_occupancy, unit_type, confidence_score, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO occupancy_forecasts (forecast_date, predicted_occupancy, actual_occupancy, unit_type, confidence_score, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [forecast_date, predicted_occupancy, actual_occupancy, unit_type, confidence_score, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { forecast_date, predicted_occupancy, actual_occupancy, unit_type, confidence_score, notes } = req.body;
    const result = await pool.query(
      `UPDATE occupancy_forecasts SET forecast_date=$1, predicted_occupancy=$2, actual_occupancy=$3, unit_type=$4, confidence_score=$5, notes=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [forecast_date, predicted_occupancy, actual_occupancy, unit_type, confidence_score, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Forecast not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM occupancy_forecasts WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Forecast not found' });
    res.json({ message: 'Forecast deleted', forecast: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
