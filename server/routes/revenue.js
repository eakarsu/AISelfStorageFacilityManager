const express = require('express');
const pool = require('../db');
const router = express.Router();
const auth = require('../middleware/auth');
router.use(auth);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM revenue_records ORDER BY transaction_date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM revenue_records WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { category, amount, description, transaction_date, payment_method, tenant_name, unit_number, period_month, period_year } = req.body;
    const result = await pool.query(
      `INSERT INTO revenue_records (category, amount, description, transaction_date, payment_method, tenant_name, unit_number, period_month, period_year)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [category, amount, description, transaction_date, payment_method, tenant_name, unit_number, period_month, period_year]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { category, amount, description, transaction_date, payment_method, tenant_name, unit_number, period_month, period_year } = req.body;
    const result = await pool.query(
      `UPDATE revenue_records SET category=$1, amount=$2, description=$3, transaction_date=$4, payment_method=$5, tenant_name=$6, unit_number=$7, period_month=$8, period_year=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [category, amount, description, transaction_date, payment_method, tenant_name, unit_number, period_month, period_year, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM revenue_records WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Record deleted', record: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
