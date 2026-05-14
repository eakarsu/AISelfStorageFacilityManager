const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const [dataRes, countRes] = await Promise.all([
      pool.query('SELECT * FROM billing_records ORDER BY due_date DESC LIMIT $1 OFFSET $2', [limit, offset]),
      pool.query('SELECT COUNT(*) FROM billing_records'),
    ]);
    const total = parseInt(countRes.rows[0].count);
    res.json({ data: dataRes.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /overdue-list - overdue accounts with dunning status
router.get('/overdue-list', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT br.*, de.dunning_stage, de.created_at as dunning_date
      FROM billing_records br
      LEFT JOIN dunning_events de ON de.billing_id = br.id AND de.id = (
        SELECT id FROM dunning_events WHERE billing_id = br.id ORDER BY created_at DESC LIMIT 1
      )
      WHERE br.status = 'overdue' OR br.due_date < NOW()
      ORDER BY br.due_date ASC
    `).catch(() => pool.query(`SELECT * FROM billing_records WHERE status = 'overdue' ORDER BY due_date ASC`));
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /:id/flag-overdue - dunning workflow
router.post('/:id/flag-overdue', async (req, res) => {
  try {
    const record = await pool.query('SELECT * FROM billing_records WHERE id = $1', [req.params.id]);
    if (record.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const bill = record.rows[0];

    const dueDate = new Date(bill.due_date);
    const daysOverdue = Math.max(0, Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

    let dunningStage = 'warning';
    if (daysOverdue >= 30) dunningStage = 'lock';
    else if (daysOverdue >= 14) dunningStage = 'final_notice';

    // Create dunning event
    await pool.query(
      `INSERT INTO dunning_events (billing_id, dunning_stage, days_overdue, amount, tenant_name)
       VALUES ($1,$2,$3,$4,$5)`,
      [bill.id, dunningStage, daysOverdue, bill.amount, bill.tenant_name]
    ).catch(() => {});

    // Update billing status
    await pool.query(`UPDATE billing_records SET status = 'overdue' WHERE id = $1`, [bill.id]);

    // Create notification
    await pool.query(
      `INSERT INTO notifications (title, message, type, status)
       VALUES ($1,$2,$3,$4)`,
      [`Overdue: ${bill.tenant_name}`, `Account ${bill.tenant_name} is ${daysOverdue} days overdue. Stage: ${dunningStage}.`, 'billing', 'unread']
    ).catch(() => {});

    res.json({ success: true, dunningStage, daysOverdue, message: `Dunning event created: ${dunningStage}` });
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
