const express = require('express');
const pool = require('../db');
const router = express.Router();
const auth = require('../middleware/auth');
router.use(auth);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM maintenance_requests ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM maintenance_requests WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, description, location, priority, status, assigned_to, requested_by, estimated_cost, completed_date } = req.body;
    const result = await pool.query(
      `INSERT INTO maintenance_requests (title, description, location, priority, status, assigned_to, requested_by, estimated_cost, completed_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [title, description, location, priority || 'medium', status || 'open', assigned_to, requested_by, estimated_cost, completed_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, description, location, priority, status, assigned_to, requested_by, estimated_cost, completed_date } = req.body;
    const result = await pool.query(
      `UPDATE maintenance_requests SET title=$1, description=$2, location=$3, priority=$4, status=$5, assigned_to=$6, requested_by=$7, estimated_cost=$8, completed_date=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [title, description, location, priority, status, assigned_to, requested_by, estimated_cost, completed_date, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM maintenance_requests WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    res.json({ message: 'Request deleted', request: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
