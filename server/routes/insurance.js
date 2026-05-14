const express = require('express');
const pool = require('../db');
const router = express.Router();
const auth = require('../middleware/auth');
router.use(auth);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM insurance_policies ORDER BY end_date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM insurance_policies WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Policy not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { tenant_name, unit_number, provider, policy_number, coverage_amount, monthly_premium, start_date, end_date, status, coverage_type } = req.body;
    const result = await pool.query(
      `INSERT INTO insurance_policies (tenant_name, unit_number, provider, policy_number, coverage_amount, monthly_premium, start_date, end_date, status, coverage_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [tenant_name, unit_number, provider, policy_number, coverage_amount, monthly_premium, start_date, end_date, status || 'active', coverage_type]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { tenant_name, unit_number, provider, policy_number, coverage_amount, monthly_premium, start_date, end_date, status, coverage_type } = req.body;
    const result = await pool.query(
      `UPDATE insurance_policies SET tenant_name=$1, unit_number=$2, provider=$3, policy_number=$4, coverage_amount=$5, monthly_premium=$6, start_date=$7, end_date=$8, status=$9, coverage_type=$10, updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [tenant_name, unit_number, provider, policy_number, coverage_amount, monthly_premium, start_date, end_date, status, coverage_type, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Policy not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM insurance_policies WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Policy not found' });
    res.json({ message: 'Policy deleted', policy: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
