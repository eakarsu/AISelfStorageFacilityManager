const express = require('express');
const pool = require('../db');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM climate_controls ORDER BY zone_name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM climate_controls WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Climate zone not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { zone_name, current_temp, target_temp, current_humidity, target_humidity, hvac_status, energy_usage_kwh, last_maintenance } = req.body;
    const result = await pool.query(
      `INSERT INTO climate_controls (zone_name, current_temp, target_temp, current_humidity, target_humidity, hvac_status, energy_usage_kwh, last_maintenance)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [zone_name, current_temp, target_temp, current_humidity, target_humidity, hvac_status || 'auto', energy_usage_kwh, last_maintenance]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { zone_name, current_temp, target_temp, current_humidity, target_humidity, hvac_status, energy_usage_kwh, last_maintenance } = req.body;
    const result = await pool.query(
      `UPDATE climate_controls SET zone_name=$1, current_temp=$2, target_temp=$3, current_humidity=$4, target_humidity=$5, hvac_status=$6, energy_usage_kwh=$7, last_maintenance=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [zone_name, current_temp, target_temp, current_humidity, target_humidity, hvac_status, energy_usage_kwh, last_maintenance, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Zone not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM climate_controls WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Zone not found' });
    res.json({ message: 'Zone deleted', zone: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
