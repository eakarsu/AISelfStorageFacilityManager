const express = require('express');
const pool = require('../db');
const router = express.Router();
const auth = require('../middleware/auth');
router.use(auth);

// Get all promotions
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM promotions ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single promotion
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM promotions WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Promotion not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create promotion
router.post('/', async (req, res) => {
  try {
    const { name, description, discount_type, discount_value, unit_type, start_date, end_date, promo_code, max_uses, is_active } = req.body;
    const result = await pool.query(
      `INSERT INTO promotions (name, description, discount_type, discount_value, unit_type, start_date, end_date, promo_code, max_uses, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [name, description, discount_type, discount_value, unit_type, start_date, end_date, promo_code, max_uses || 0, is_active !== false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update promotion
router.put('/:id', async (req, res) => {
  try {
    const { name, description, discount_type, discount_value, unit_type, start_date, end_date, promo_code, max_uses, current_uses, is_active } = req.body;
    const result = await pool.query(
      `UPDATE promotions SET name=$1, description=$2, discount_type=$3, discount_value=$4, unit_type=$5,
       start_date=$6, end_date=$7, promo_code=$8, max_uses=$9, current_uses=$10, is_active=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [name, description, discount_type, discount_value, unit_type, start_date, end_date, promo_code, max_uses, current_uses, is_active, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Promotion not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete promotion
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM promotions WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Promotion not found' });
    res.json({ message: 'Promotion deleted', promotion: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
