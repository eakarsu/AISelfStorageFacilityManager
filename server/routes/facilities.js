const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.use(auth);

// GET /api/facilities
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const [dataRes, countRes] = await Promise.all([
      pool.query(`SELECT * FROM facilities ORDER BY created_at DESC LIMIT $1 OFFSET $2`, [limit, offset]),
      pool.query(`SELECT COUNT(*) FROM facilities`),
    ]);
    const total = parseInt(countRes.rows[0].count);
    res.json({ data: dataRes.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM facilities WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Facility not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, address, city, state, phone, email, total_units, manager_name } = req.body;
    const result = await pool.query(
      `INSERT INTO facilities (name, address, city, state, phone, email, total_units, manager_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name, address, city, state, phone, email, total_units, manager_name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, address, city, state, phone, email, total_units, manager_name } = req.body;
    const result = await pool.query(
      `UPDATE facilities SET name=$1, address=$2, city=$3, state=$4, phone=$5, email=$6, total_units=$7, manager_name=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [name, address, city, state, phone, email, total_units, manager_name, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Facility not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM facilities WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Facility not found' });
    res.json({ message: 'Facility deleted', facility: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
