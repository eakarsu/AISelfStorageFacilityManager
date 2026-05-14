const express = require('express');
const pool = require('../db');
const router = express.Router();
const auth = require('../middleware/auth');
router.use(auth);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM move_activities ORDER BY scheduled_date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM move_activities WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Activity not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { tenant_name, unit_number, activity_type, scheduled_date, completed_date, status, requires_elevator, special_instructions, staff_assigned } = req.body;
    const result = await pool.query(
      `INSERT INTO move_activities (tenant_name, unit_number, activity_type, scheduled_date, completed_date, status, requires_elevator, special_instructions, staff_assigned)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [tenant_name, unit_number, activity_type, scheduled_date, completed_date, status || 'scheduled', requires_elevator || false, special_instructions, staff_assigned]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { tenant_name, unit_number, activity_type, scheduled_date, completed_date, status, requires_elevator, special_instructions, staff_assigned } = req.body;
    const result = await pool.query(
      `UPDATE move_activities SET tenant_name=$1, unit_number=$2, activity_type=$3, scheduled_date=$4, completed_date=$5, status=$6, requires_elevator=$7, special_instructions=$8, staff_assigned=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [tenant_name, unit_number, activity_type, scheduled_date, completed_date, status, requires_elevator, special_instructions, staff_assigned, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Activity not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM move_activities WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Activity not found' });
    res.json({ message: 'Activity deleted', activity: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
