const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pricing_rules ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pricing_rules WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Pricing rule not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { rule_name, unit_type, base_price, demand_multiplier, season, min_price, max_price, is_active } = req.body;
    const result = await pool.query(
      `INSERT INTO pricing_rules (rule_name, unit_type, base_price, demand_multiplier, season, min_price, max_price, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [rule_name, unit_type, base_price, demand_multiplier, season, min_price, max_price, is_active !== false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { rule_name, unit_type, base_price, demand_multiplier, season, min_price, max_price, is_active } = req.body;
    const result = await pool.query(
      `UPDATE pricing_rules SET rule_name=$1, unit_type=$2, base_price=$3, demand_multiplier=$4, season=$5, min_price=$6, max_price=$7, is_active=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [rule_name, unit_type, base_price, demand_multiplier, season, min_price, max_price, is_active, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Rule not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM pricing_rules WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Rule not found' });
    res.json({ message: 'Rule deleted', rule: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
