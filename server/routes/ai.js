const express = require('express');
const axios = require('axios');
const pool = require('../db');
const router = express.Router();

async function callOpenRouter(prompt, context) {
  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5',
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant for a self-storage facility manager. Provide professional, actionable insights based on the data provided. Format your response with clear sections using markdown headers (##), bullet points, and bold text for key metrics. Be concise but thorough.'
        },
        {
          role: 'user',
          content: `${prompt}\n\nData Context:\n${JSON.stringify(context, null, 2)}`
        }
      ],
      max_tokens: 1500
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Self-Storage Manager'
      }
    }
  );

  return response.data;
}

// AI Pricing Analysis
router.post('/pricing-analysis', async (req, res) => {
  try {
    const rules = await pool.query('SELECT * FROM pricing_rules ORDER BY created_at DESC LIMIT 20');
    const units = await pool.query('SELECT unit_type, COUNT(*) as count, AVG(monthly_rate) as avg_rate FROM storage_units GROUP BY unit_type');

    const result = await callOpenRouter(
      'Analyze the current pricing rules and unit rates for this self-storage facility. Suggest optimal pricing adjustments based on demand patterns, seasonal trends, and competitive positioning. Identify any pricing rules that may need updating.',
      { pricing_rules: rules.rows, unit_summary: units.rows }
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Occupancy Forecast
router.post('/occupancy-forecast', async (req, res) => {
  try {
    const forecasts = await pool.query('SELECT * FROM occupancy_forecasts ORDER BY forecast_date DESC LIMIT 20');
    const units = await pool.query(`SELECT status, COUNT(*) as count FROM storage_units GROUP BY status`);

    const result = await callOpenRouter(
      'Based on the historical occupancy data and current unit status, provide a detailed occupancy forecast for the next 3 months. Include predicted trends, seasonal factors, and recommendations to optimize occupancy rates.',
      { historical_forecasts: forecasts.rows, current_status: units.rows }
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Climate Optimization
router.post('/climate-optimization', async (req, res) => {
  try {
    const zones = await pool.query('SELECT * FROM climate_controls');

    const result = await callOpenRouter(
      'Analyze the climate control data for all zones in this storage facility. Identify zones with inefficient temperature/humidity settings, suggest energy-saving optimizations, and flag any zones that need maintenance attention. Consider the impact on stored items.',
      { climate_zones: zones.rows }
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Security Analysis
router.post('/security-analysis', async (req, res) => {
  try {
    const events = await pool.query('SELECT * FROM security_events ORDER BY event_time DESC LIMIT 30');
    const unresolved = await pool.query('SELECT COUNT(*) as count FROM security_events WHERE resolved = false');

    const result = await callOpenRouter(
      'Analyze recent security events at this storage facility. Identify patterns, high-risk areas, and provide recommendations for improving security. Highlight any urgent unresolved events and suggest preventive measures.',
      { recent_events: events.rows, unresolved_count: unresolved.rows[0].count }
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Billing Insights
router.post('/billing-insights', async (req, res) => {
  try {
    const records = await pool.query('SELECT * FROM billing_records ORDER BY due_date DESC LIMIT 20');
    const stats = await pool.query(`
      SELECT status, COUNT(*) as count, SUM(amount) as total
      FROM billing_records GROUP BY status
    `);

    const result = await callOpenRouter(
      'Analyze the billing data for this storage facility. Identify overdue accounts, revenue trends, payment patterns, and provide recommendations for improving collection rates and revenue optimization. Suggest strategies for reducing late payments.',
      { billing_records: records.rows, billing_stats: stats.rows }
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Tenant Analysis
router.post('/tenant-analysis', async (req, res) => {
  try {
    const tenants = await pool.query('SELECT * FROM tenants ORDER BY last_name LIMIT 30');
    const expiring = await pool.query(`SELECT COUNT(*) as count FROM tenants WHERE lease_end < NOW() + INTERVAL '30 days'`);

    const result = await callOpenRouter(
      'Analyze the tenant data for this storage facility. Identify lease expiration risks, tenant retention opportunities, and provide recommendations for improving tenant satisfaction and reducing churn. Flag any tenants with upcoming lease expirations.',
      { tenants: tenants.rows, expiring_soon: expiring.rows[0].count }
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Maintenance Analysis
router.post('/maintenance-analysis', async (req, res) => {
  try {
    const requests = await pool.query('SELECT * FROM maintenance_requests ORDER BY created_at DESC LIMIT 30');
    const openCount = await pool.query(`SELECT COUNT(*) as count FROM maintenance_requests WHERE status IN ('open','in_progress')`);

    const result = await callOpenRouter(
      'Analyze the maintenance request data for this storage facility. Identify recurring issues, prioritize urgent repairs, estimate resource allocation needs, and suggest preventive maintenance strategies to reduce future issues.',
      { maintenance_requests: requests.rows, open_requests: openCount.rows[0].count }
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Access Pattern Analysis
router.post('/access-analysis', async (req, res) => {
  try {
    const logs = await pool.query('SELECT * FROM access_logs ORDER BY access_time DESC LIMIT 40');
    const denied = await pool.query('SELECT COUNT(*) as count FROM access_logs WHERE granted = false');

    const result = await callOpenRouter(
      'Analyze the access log data for this storage facility. Identify unusual access patterns, peak access times, denied access attempts, and provide security recommendations. Suggest optimal staffing hours based on access patterns.',
      { access_logs: logs.rows, denied_access_count: denied.rows[0].count }
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Insurance Analysis
router.post('/insurance-analysis', async (req, res) => {
  try {
    const policies = await pool.query('SELECT * FROM insurance_policies ORDER BY end_date DESC LIMIT 30');
    const stats = await pool.query(`SELECT status, COUNT(*) as count FROM insurance_policies GROUP BY status`);

    const result = await callOpenRouter(
      'Analyze the insurance policy data for this storage facility. Identify expiring policies, coverage gaps, and provide recommendations for ensuring all tenants have adequate coverage. Suggest optimal coverage levels based on unit types and stored items.',
      { policies: policies.rows, policy_stats: stats.rows }
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Move-In/Move-Out Analysis
router.post('/moveio-analysis', async (req, res) => {
  try {
    const activities = await pool.query('SELECT * FROM move_activities ORDER BY scheduled_date DESC LIMIT 30');
    const stats = await pool.query(`SELECT activity_type, COUNT(*) as count FROM move_activities GROUP BY activity_type`);

    const result = await callOpenRouter(
      'Analyze the move-in/move-out activity data for this storage facility. Identify trends in tenant turnover, peak moving periods, staffing needs, and provide recommendations for streamlining the move process. Suggest strategies to improve move-in conversion rates.',
      { activities: activities.rows, activity_stats: stats.rows }
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Revenue Analysis
router.post('/revenue-analysis', async (req, res) => {
  try {
    const records = await pool.query('SELECT * FROM revenue_records ORDER BY transaction_date DESC LIMIT 30');
    const stats = await pool.query(`SELECT category, SUM(amount) as total, COUNT(*) as count FROM revenue_records GROUP BY category`);

    const result = await callOpenRouter(
      'Analyze the revenue data for this storage facility. Break down revenue by category, identify growth opportunities, seasonal trends, and provide recommendations for increasing ancillary revenue streams. Compare performance against industry benchmarks for self-storage facilities.',
      { revenue_records: records.rows, revenue_by_category: stats.rows }
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
