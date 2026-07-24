const express = require('express');
const axios = require('axios');
const pool = require('../db');
const auth = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

const MODEL = 'anthropic/claude-3-5-sonnet-20241022';

// 3-strategy JSON parser
function parseAIJson(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch (_) {}
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) { try { return JSON.parse(codeBlock[1].trim()); } catch (_) {} }
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) { try { return JSON.parse(jsonMatch[1]); } catch (_) {} }
  return null;
}

async function callOpenRouter(prompt, context) {
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is required');
  const baseUrl = (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
  const response = await axios.post(
    `${baseUrl}/chat/completions`,
    {
      model: process.env.OPENROUTER_MODEL || MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant for a self-storage facility manager. Provide professional, actionable insights. Always respond with valid JSON containing a "summary" field and relevant structured data fields.'
        },
        {
          role: 'user',
          content: `${prompt}\n\nData Context:\n${JSON.stringify(context, null, 2)}`
        }
      ],
      max_tokens: 1500,
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:3000',
        'X-Title': 'AI Self-Storage Manager',
      }
    }
  );

  const content = response.data.choices?.[0]?.message?.content;
  if (!content || !String(content).trim()) throw new Error('OpenRouter returned an empty response');
  const parsed = parseAIJson(content);
  return { success: true, result: parsed || { summary: content }, model: response.data.model, raw: content };
}

async function persistResult(userId, endpoint, entityId, result) {
  await pool.query(
    `INSERT INTO ai_results (user_id, endpoint, entity_id, result) VALUES ($1,$2,$3,$4)`,
    [userId, endpoint, entityId, JSON.stringify(result)]
  );
}

// Apply auth to all AI routes
router.use(auth);

// GET /api/occupancy/current - computed occupancy rate
router.get('/occupancy-current', async (req, res) => {
  try {
    const facilityId = req.query.facility_id;
    const whereClause = facilityId ? 'WHERE facility_id = $1' : '';
    const params = facilityId ? [facilityId] : [];
    const result = await pool.query(
      `SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'occupied' THEN 1 END) as occupied,
        COUNT(CASE WHEN status = 'available' THEN 1 END) as available,
        COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance
       FROM storage_units ${whereClause}`,
      params
    );
    const data = result.rows[0];
    const total = parseInt(data.total) || 0;
    const occupied = parseInt(data.occupied) || 0;
    const occupancyRate = total > 0 ? parseFloat(((occupied / total) * 100).toFixed(2)) : 0;
    res.json({ success: true, result: { total, occupied, available: parseInt(data.available), maintenance: parseInt(data.maintenance), occupancyRate } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Pricing Analysis
router.post('/pricing-analysis', aiRateLimiter, async (req, res) => {
  try {
    const rules = await pool.query('SELECT * FROM pricing_rules ORDER BY created_at DESC LIMIT 20');
    const units = await pool.query('SELECT unit_type, COUNT(*) as count, AVG(monthly_rate) as avg_rate FROM storage_units GROUP BY unit_type');
    const result = await callOpenRouter(
      'Analyze current pricing. Respond with JSON: {"summary": "text", "pricing_adjustments": [{"unit_type": "type", "current_rate": X, "suggested_rate": Y, "reason": "text"}], "overall_recommendation": "text", "revenue_impact": "text"}',
      { pricing_rules: rules.rows, unit_summary: units.rows }
    );
    await persistResult(req.user.id, 'pricing-analysis', null, result.result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /apply-pricing - apply AI pricing recommendation
router.post('/apply-pricing', aiRateLimiter, async (req, res) => {
  try {
    const rules = await pool.query('SELECT * FROM pricing_rules ORDER BY created_at DESC LIMIT 20');
    const units = await pool.query('SELECT unit_type, COUNT(*) as count, AVG(monthly_rate) as avg_rate FROM storage_units GROUP BY unit_type');

    const aiResult = await callOpenRouter(
      'Suggest pricing rule updates. Respond with JSON: {"adjustments": [{"unit_type": "type", "new_rate": <number>, "reason": "text"}]}',
      { pricing_rules: rules.rows, unit_summary: units.rows }
    );

    const adjustments = aiResult.result?.adjustments || [];
    let applied = 0;
    for (const adj of adjustments) {
      if (adj.unit_type && adj.new_rate) {
        const updateResult = await pool.query(
          `UPDATE storage_units SET monthly_rate = $1 WHERE unit_type = $2 AND status = 'available'`,
          [adj.new_rate, adj.unit_type]
        ).catch(() => ({ rowCount: 0 }));

        // Audit log
        await pool.query(
          `INSERT INTO ai_results (user_id, endpoint, entity_id, result) VALUES ($1,$2,$3,$4)`,
          [req.user.id, 'apply-pricing-audit', null, JSON.stringify({ unit_type: adj.unit_type, new_rate: adj.new_rate, rows_updated: updateResult.rowCount, reason: adj.reason })]
        ).catch(() => {});
        applied++;
      }
    }

    res.json({ success: true, result: { adjustments, applied, message: `Applied ${applied} pricing adjustments` }, model: aiResult.model });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Occupancy Forecast
router.post('/occupancy-forecast', aiRateLimiter, async (req, res) => {
  try {
    const forecasts = await pool.query('SELECT * FROM occupancy_forecasts ORDER BY forecast_date DESC LIMIT 20');
    const units = await pool.query(`SELECT status, COUNT(*) as count FROM storage_units GROUP BY status`);
    const result = await callOpenRouter(
      'Forecast occupancy for next 3 months. Respond with JSON: {"summary": "text", "predictions": [{"month": "text", "predicted_occupancy": <number>, "confidence": "low|medium|high", "factors": ["factor1"]}], "recommendations": ["rec1"]}',
      { historical_forecasts: forecasts.rows, current_status: units.rows }
    );
    await persistResult(req.user.id, 'occupancy-forecast', null, result.result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Climate Optimization
router.post('/climate-optimization', aiRateLimiter, async (req, res) => {
  try {
    const zones = await pool.query('SELECT * FROM climate_controls');
    const result = await callOpenRouter(
      'Analyze climate control data. Respond with JSON: {"summary": "text", "inefficient_zones": [{"zone_id": id, "issue": "text", "recommendation": "text"}], "energy_savings_estimate": "text", "priority_actions": ["action1"]}',
      { climate_zones: zones.rows }
    );
    await persistResult(req.user.id, 'climate-optimization', null, result.result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Security Analysis
router.post('/security-analysis', aiRateLimiter, async (req, res) => {
  try {
    const events = await pool.query('SELECT * FROM security_events ORDER BY event_time DESC LIMIT 30');
    const unresolved = await pool.query('SELECT COUNT(*) as count FROM security_events WHERE resolved = false');
    const result = await callOpenRouter(
      'Analyze security events. Respond with JSON: {"summary": "text", "risk_level": "low|medium|high|critical", "patterns": ["pattern1"], "urgent_items": [{"event_id": id, "concern": "text"}], "recommendations": ["rec1"]}',
      { recent_events: events.rows, unresolved_count: unresolved.rows[0].count }
    );
    await persistResult(req.user.id, 'security-analysis', null, result.result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Billing Insights
router.post('/billing-insights', aiRateLimiter, async (req, res) => {
  try {
    const records = await pool.query('SELECT * FROM billing_records ORDER BY due_date DESC LIMIT 20');
    const stats = await pool.query(`SELECT status, COUNT(*) as count, SUM(amount) as total FROM billing_records GROUP BY status`);
    const result = await callOpenRouter(
      'Analyze billing. Respond with JSON: {"summary": "text", "overdue_count": <number>, "at_risk_accounts": [{"tenant": "name", "amount": <number>, "days_overdue": <number>}], "collection_recommendations": ["rec1"], "revenue_insights": "text"}',
      { billing_records: records.rows, billing_stats: stats.rows }
    );
    await persistResult(req.user.id, 'billing-insights', null, result.result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Tenant Analysis
router.post('/tenant-analysis', aiRateLimiter, async (req, res) => {
  try {
    const tenants = await pool.query('SELECT * FROM tenants ORDER BY last_name LIMIT 30');
    const expiring = await pool.query(`SELECT COUNT(*) as count FROM tenants WHERE lease_end < NOW() + INTERVAL '30 days'`);
    const result = await callOpenRouter(
      'Analyze tenants. Respond with JSON: {"summary": "text", "expiring_soon_count": <number>, "churn_risk_tenants": [{"name": "text", "risk_reason": "text"}], "retention_strategies": ["strategy1"], "occupancy_insights": "text"}',
      { tenants: tenants.rows, expiring_soon: expiring.rows[0].count }
    );
    await persistResult(req.user.id, 'tenant-analysis', null, result.result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Maintenance Analysis
router.post('/maintenance-analysis', aiRateLimiter, async (req, res) => {
  try {
    const requests = await pool.query('SELECT * FROM maintenance_requests ORDER BY created_at DESC LIMIT 30');
    const openCount = await pool.query(`SELECT COUNT(*) as count FROM maintenance_requests WHERE status IN ('open','in_progress')`);
    const result = await callOpenRouter(
      'Analyze maintenance. Respond with JSON: {"summary": "text", "open_requests": <number>, "recurring_issues": ["issue1"], "urgent_items": [{"id": n, "description": "text"}], "preventive_recommendations": ["rec1"]}',
      { maintenance_requests: requests.rows, open_requests: openCount.rows[0].count }
    );
    await persistResult(req.user.id, 'maintenance-analysis', null, result.result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Access Pattern Analysis
router.post('/access-analysis', aiRateLimiter, async (req, res) => {
  try {
    const logs = await pool.query('SELECT * FROM access_logs ORDER BY access_time DESC LIMIT 40');
    const denied = await pool.query('SELECT COUNT(*) as count FROM access_logs WHERE granted = false');
    const result = await callOpenRouter(
      'Analyze access patterns. Respond with JSON: {"summary": "text", "peak_hours": ["hour1"], "denied_access_count": <number>, "suspicious_patterns": ["pattern1"], "staffing_recommendations": "text", "security_recommendations": ["rec1"]}',
      { access_logs: logs.rows, denied_access_count: denied.rows[0].count }
    );
    await persistResult(req.user.id, 'access-analysis', null, result.result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Insurance Analysis
router.post('/insurance-analysis', aiRateLimiter, async (req, res) => {
  try {
    const policies = await pool.query('SELECT * FROM insurance_policies ORDER BY end_date DESC LIMIT 30');
    const stats = await pool.query(`SELECT status, COUNT(*) as count FROM insurance_policies GROUP BY status`);
    const result = await callOpenRouter(
      'Analyze insurance. Respond with JSON: {"summary": "text", "expiring_count": <number>, "coverage_gaps": ["gap1"], "expiring_policies": [{"policy_id": n, "days_remaining": <number>}], "recommendations": ["rec1"]}',
      { policies: policies.rows, policy_stats: stats.rows }
    );
    await persistResult(req.user.id, 'insurance-analysis', null, result.result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Move-In/Move-Out Analysis
router.post('/moveio-analysis', aiRateLimiter, async (req, res) => {
  try {
    const activities = await pool.query('SELECT * FROM move_activities ORDER BY scheduled_date DESC LIMIT 30');
    const stats = await pool.query(`SELECT activity_type, COUNT(*) as count FROM move_activities GROUP BY activity_type`);
    const result = await callOpenRouter(
      'Analyze move activities. Respond with JSON: {"summary": "text", "peak_periods": ["period1"], "turnover_rate": "text", "staffing_needs": "text", "conversion_strategies": ["strategy1"]}',
      { activities: activities.rows, activity_stats: stats.rows }
    );
    await persistResult(req.user.id, 'moveio-analysis', null, result.result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Revenue Analysis
router.post('/revenue-analysis', aiRateLimiter, async (req, res) => {
  try {
    const records = await pool.query('SELECT * FROM revenue_records ORDER BY transaction_date DESC LIMIT 30');
    const stats = await pool.query(`SELECT category, SUM(amount) as total, COUNT(*) as count FROM revenue_records GROUP BY category`);
    const result = await callOpenRouter(
      'Analyze revenue. Respond with JSON: {"summary": "text", "total_revenue": <number>, "by_category": [{"category": "text", "amount": <number>}], "growth_opportunities": ["opportunity1"], "seasonal_trends": "text", "recommendations": ["rec1"]}',
      { revenue_records: records.rows, revenue_by_category: stats.rows }
    );
    await persistResult(req.user.id, 'revenue-analysis', null, result.result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Unit Sizing Recommendation
router.post('/unit-sizing-recommendation', aiRateLimiter, async (req, res) => {
  try {
    const { items_description, item_categories, lifestyle_notes, budget_max } = req.body || {};
    const sizes = await pool.query(`SELECT DISTINCT size, COUNT(*) as cnt, MIN(monthly_rate) as min_rate, MAX(monthly_rate) as max_rate FROM storage_units WHERE status='available' GROUP BY size`).catch(() => ({ rows: [] }));
    const result = await callOpenRouter(
      'Recommend the best storage unit size for the prospective tenant. Respond JSON: {"summary":"...","recommended_size":"...","alternatives":[{"size":"","fit_score":0-100,"reason":""}],"estimated_monthly_rate":number,"packing_tips":[],"upgrade_or_downgrade_advice":""}',
      { items_description, item_categories: item_categories || [], lifestyle_notes: lifestyle_notes || '', budget_max: budget_max || null, available_sizes: sizes.rows }
    );
    await persistResult(req.user.id, 'unit-sizing-recommendation', null, result.result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Tenant Churn Prediction
router.post('/churn-prediction', aiRateLimiter, async (req, res) => {
  try {
    const tenants = await pool.query(`SELECT t.id, t.first_name, t.last_name, t.move_in_date, COUNT(b.id) as bills, SUM(CASE WHEN b.status='overdue' THEN 1 ELSE 0 END) as overdue_count, MAX(t.last_access_at) as last_access_at FROM tenants t LEFT JOIN bills b ON b.tenant_id=t.id GROUP BY t.id ORDER BY t.move_in_date DESC LIMIT 100`).catch(() => ({ rows: [] }));
    const accessRecent = await pool.query(`SELECT tenant_id, MAX(access_at) as last_access FROM access_logs GROUP BY tenant_id`).catch(() => ({ rows: [] }));
    const result = await callOpenRouter(
      'Predict which tenants are at risk of churning in the next 60 days and recommend retention offers. Respond JSON: {"summary":"...","at_risk_tenants":[{"tenant_id":number,"name":"","churn_probability":0-1,"top_signals":[],"recommended_offer":""}],"segmented_actions":[{"segment":"","action":""}],"expected_revenue_at_risk":number}',
      { tenants: tenants.rows, recent_access: accessRecent.rows }
    );
    await persistResult(req.user.id, 'churn-prediction', null, result.result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Security Alert Analysis (apply pass 4 backlog)
router.post('/security-alert-analysis', aiRateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured' });
    }
    const { hours_back, include_resolved, focus_zones } = req.body || {};
    const hours = Math.min(Math.max(parseInt(hours_back) || 72, 1), 720);
    const events = await pool.query(
      `SELECT * FROM security_events WHERE event_time > NOW() - INTERVAL '${hours} hours' ${include_resolved ? '' : 'AND resolved = false'} ORDER BY event_time DESC LIMIT 100`
    ).catch(() => ({ rows: [] }));
    const counts = await pool.query(
      `SELECT event_type, COUNT(*) as cnt FROM security_events WHERE event_time > NOW() - INTERVAL '${hours} hours' GROUP BY event_type`
    ).catch(() => ({ rows: [] }));
    const result = await callOpenRouter(
      'Triage and summarize recent camera/alarm/access security events. Respond JSON: {"summary":"...","threat_level":"low|medium|high|critical","clusters":[{"pattern":"","event_ids":[],"severity":"low|medium|high|critical"}],"prioritized_alerts":[{"event_id":number,"action":"","why":""}],"false_positive_candidates":[number],"recommended_camera_checks":[]}',
      { events: events.rows, event_type_counts: counts.rows, focus_zones: focus_zones || [], lookback_hours: hours }
    );
    await persistResult(req.user.id, 'security-alert-analysis', null, result.result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Late Payment Risk
router.post('/late-payment-risk', aiRateLimiter, async (req, res) => {
  try {
    const bills = await pool.query(`SELECT b.id, b.tenant_id, b.amount, b.due_date, b.status, t.first_name, t.last_name FROM bills b LEFT JOIN tenants t ON b.tenant_id=t.id WHERE b.status IN ('pending','due_soon','overdue') ORDER BY b.due_date ASC LIMIT 200`).catch(() => ({ rows: [] }));
    const history = await pool.query(`SELECT tenant_id, COUNT(*) FILTER (WHERE status='paid_late') as late_count, COUNT(*) as total_count FROM bills GROUP BY tenant_id`).catch(() => ({ rows: [] }));
    const result = await callOpenRouter(
      'Score each upcoming/overdue bill for late-payment risk and recommend proactive collection actions. Respond JSON: {"summary":"...","risk_scores":[{"bill_id":number,"tenant_id":number,"risk_score":0-100,"reason":"","recommended_action":""}],"prioritized_outreach":[{"bill_id":number,"channel":"sms|email|call","script":""}],"expected_collection_lift_pct":number}',
      { bills: bills.rows, payment_history: history.rows }
    );
    await persistResult(req.user.id, 'late-payment-risk', null, result.result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
