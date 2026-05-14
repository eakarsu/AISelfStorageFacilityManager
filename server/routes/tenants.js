const express = require('express');
const pool = require('../db');
const router = express.Router();
const auth = require('../middleware/auth');
router.use(auth);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tenants ORDER BY last_name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tenants WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tenant not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { first_name, last_name, email, phone, unit_number, lease_start, lease_end, emergency_contact, id_verified, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO tenants (first_name, last_name, email, phone, unit_number, lease_start, lease_end, emergency_contact, id_verified, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [first_name, last_name, email, phone, unit_number, lease_start, lease_end, emergency_contact, id_verified || false, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { first_name, last_name, email, phone, unit_number, lease_start, lease_end, emergency_contact, id_verified, notes } = req.body;
    const result = await pool.query(
      `UPDATE tenants SET first_name=$1, last_name=$2, email=$3, phone=$4, unit_number=$5, lease_start=$6, lease_end=$7, emergency_contact=$8, id_verified=$9, notes=$10, updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [first_name, last_name, email, phone, unit_number, lease_start, lease_end, emergency_contact, id_verified, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tenant not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM tenants WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tenant not found' });
    res.json({ message: 'Tenant deleted', tenant: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
