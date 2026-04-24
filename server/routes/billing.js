const express = require('express');
const pool = require('../db');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM billing_records ORDER BY due_date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM billing_records WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { tenant_name, tenant_email, unit_number, amount, due_date, status, payment_method, auto_pay } = req.body;
    const result = await pool.query(
      `INSERT INTO billing_records (tenant_name, tenant_email, unit_number, amount, due_date, status, payment_method, auto_pay)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [tenant_name, tenant_email, unit_number, amount, due_date, status || 'pending', payment_method, auto_pay || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { tenant_name, tenant_email, unit_number, amount, due_date, status, payment_method, auto_pay } = req.body;
    const result = await pool.query(
      `UPDATE billing_records SET tenant_name=$1, tenant_email=$2, unit_number=$3, amount=$4, due_date=$5, status=$6, payment_method=$7, auto_pay=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [tenant_name, tenant_email, unit_number, amount, due_date, status, payment_method, auto_pay, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM billing_records WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Record deleted', record: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
