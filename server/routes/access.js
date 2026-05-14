const express = require('express');
const pool = require('../db');
const router = express.Router();
const auth = require('../middleware/auth');
router.use(auth);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM access_logs ORDER BY access_time DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM access_logs WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Log not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { tenant_name, unit_number, access_type, access_method, access_time, granted, denied_reason } = req.body;
    const result = await pool.query(
      `INSERT INTO access_logs (tenant_name, unit_number, access_type, access_method, access_time, granted, denied_reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [tenant_name, unit_number, access_type, access_method, access_time || new Date(), granted !== false, denied_reason]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { tenant_name, unit_number, access_type, access_method, access_time, granted, denied_reason } = req.body;
    const result = await pool.query(
      `UPDATE access_logs SET tenant_name=$1, unit_number=$2, access_type=$3, access_method=$4, access_time=$5, granted=$6, denied_reason=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [tenant_name, unit_number, access_type, access_method, access_time, granted, denied_reason, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Log not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM access_logs WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Log not found' });
    res.json({ message: 'Log deleted', log: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
