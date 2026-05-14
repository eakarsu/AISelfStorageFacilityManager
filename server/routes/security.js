const express = require('express');
const pool = require('../db');
const router = express.Router();
const auth = require('../middleware/auth');
router.use(auth);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM security_events ORDER BY event_time DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM security_events WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { event_type, location, severity, description, camera_id, resolved, resolved_by } = req.body;
    const result = await pool.query(
      `INSERT INTO security_events (event_type, location, severity, description, camera_id, resolved, resolved_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [event_type, location, severity, description, camera_id, resolved || false, resolved_by]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { event_type, location, severity, description, camera_id, resolved, resolved_by } = req.body;
    const result = await pool.query(
      `UPDATE security_events SET event_type=$1, location=$2, severity=$3, description=$4, camera_id=$5, resolved=$6, resolved_by=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [event_type, location, severity, description, camera_id, resolved, resolved_by, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM security_events WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.json({ message: 'Event deleted', event: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
