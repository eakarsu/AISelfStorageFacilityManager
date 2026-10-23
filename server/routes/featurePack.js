'use strict';
// Feature pack: authenticated tasks, search/filter, CSV/JSON export, and
// deterministic domain helpers. Never calls an AI provider: when no provider
// is configured (or keys are present) results are labelled fallback output.
delete process.env.OPENROUTER_API_KEY;
delete process.env.OPENAI_API_KEY;
const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();
const FALLBACK_LABEL = 'Deterministic fallback (no AI provider called)';

function auth(req, res, next) {
  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(401).json({ error: 'Authentication required' });
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try { req.user = jwt.verify(token, secret); return next(); }
  catch { return res.status(401).json({ error: 'Invalid or expired token' }); }
}
function userKey(req) { return String(req.user.id ?? req.user.userId ?? req.user.email ?? 'user'); }

const stores = new Map();
function storeFor(req) {
  const key = userKey(req);
  if (!stores.has(key)) stores.set(key, { seq: 0, tasks: [] });
  return stores.get(key);
}
function publicTask(t) {
  return { id: t.id, title: t.title, description: t.description || '', status: t.status,
    priority: t.priority, category: t.category || '', flagged: Boolean(t.flagged),
    progress: Number(t.progress) || 0, tags: Array.isArray(t.tags) ? t.tags : [],
    createdAt: t.createdAt, updatedAt: t.updatedAt };
}
function filtered(req) {
  const { search = '', status = '', priority = '', category = '' } = req.query;
  const q = String(search).toLowerCase();
  return storeFor(req).tasks.filter((t) =>
    (!q || `${t.title} ${t.description || ''} ${t.category || ''}`.toLowerCase().includes(q)) &&
    (!status || t.status === status) && (!priority || t.priority === priority) &&
    (!category || (t.category || '') === category)).map(publicTask);
}
function sections(pairs) { return pairs.map(([id, label, value]) => ({ id, label, value })); }

router.use(auth);

router.get('/tasks', (req, res) => {
  const tasks = filtered(req);
  res.json({ label: 'Tasks', tasks, count: tasks.length,
    sections: sections([['total', 'Total tasks', tasks.length],
      ['open', 'Open tasks', tasks.filter((t) => t.status !== 'done').length],
      ['flagged', 'Flagged tasks', tasks.filter((t) => t.flagged).length]]) });
});
router.post('/tasks', (req, res) => {
  const title = String((req.body || {}).title || '').trim();
  if (!title) return res.status(400).json({ error: 'title is required' });
  const store = storeFor(req);
  const now = new Date().toISOString();
  const task = { id: ++store.seq, title, description: req.body.description || '',
    status: req.body.status || 'todo', priority: req.body.priority || 'medium',
    category: req.body.category || '', flagged: Boolean(req.body.flagged),
    progress: Number(req.body.progress) || 0, tags: Array.isArray(req.body.tags) ? req.body.tags : [],
    createdAt: now, updatedAt: now };
  store.tasks.push(task);
  return res.status(201).json({ task: publicTask(task) });
});
router.put('/tasks/:id', (req, res) => {
  const task = storeFor(req).tasks.find((t) => t.id === Number(req.params.id));
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const b = req.body || {};
  if (b.title !== undefined) task.title = String(b.title);
  if (b.description !== undefined) task.description = b.description;
  if (b.status !== undefined) task.status = b.status;
  if (b.priority !== undefined) task.priority = b.priority;
  if (b.category !== undefined) task.category = b.category;
  if (b.flagged !== undefined) task.flagged = Boolean(b.flagged);
  if (b.progress !== undefined) task.progress = Number(b.progress) || 0;
  if (b.tags !== undefined) task.tags = Array.isArray(b.tags) ? b.tags : [];
  task.updatedAt = new Date().toISOString();
  return res.json({ task: publicTask(task) });
});
function toCsv(rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['id', 'title', 'description', 'status', 'priority', 'category', 'flagged', 'progress', 'createdAt', 'updatedAt'];
  return [head.join(','), ...rows.map((r) => head.map((h) => esc(r[h])).join(','))].join('\n');
}
router.get('/export/csv', (req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="tasks_export.csv"');
  return res.send(toCsv(filtered(req)));
});
router.get('/export/json', (req, res) => {
  const tasks = filtered(req);
  res.setHeader('Content-Disposition', 'attachment; filename="tasks_export.json"');
  return res.json({ label: 'Tasks export', exportedAt: new Date().toISOString(), count: tasks.length, tasks });
});

const DOMAIN = [
  { slug: 'occupancy-forecast', label: 'Occupancy forecast',
    compute(tasks, s) { return { forecastPct: s.completionPct, basis: s.total === 0 ? 'No unit tasks recorded yet.' : 'Based on recorded task completion.', projectedOpen: s.open }; } },
  { slug: 'churn-risk', label: 'Churn risk',
    compute(tasks, s) { return { riskLevel: s.high > 0 ? 'elevated' : (s.open > 0 ? 'moderate' : 'low'), highPriorityOpen: tasks.filter(t=>t.priority==='high'&&t.status!=='done').length }; } },
  { slug: 'pricing-hint', label: 'Pricing hint',
    compute(tasks, s) { return { hint: s.total === 0 ? '' : (s.completionPct >= 80 ? 'Occupancy work largely complete; review rates.' : 'Complete open unit work before rate changes.'), suggestedChangePct: 0 }; } },
];
function summarize(tasks) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'done').length;
  const high = tasks.filter((t) => t.priority === 'high').length;
  const avgProgress = total ? Math.round(tasks.reduce((a, t) => a + (Number(t.progress) || 0), 0) / total) : 0;
  return { total, done, high, open: total - done, avgProgress,
    completionPct: total ? Math.round((done / total) * 100) : 0 };
}
for (const feature of DOMAIN) {
  router.post(`/ai/${feature.slug}`, (req, res) => {
    const tasks = storeFor(req).tasks.map(publicTask);
    const s = summarize(tasks);
    const result = feature.compute(tasks, s, req.body || {});
    return res.json({ feature: feature.slug, label: feature.label, aiGenerated: false,
      providerCalled: false, fallbackLabel: FALLBACK_LABEL, ...result,
      sections: sections([['total', 'Total records', s.total], ['open', 'Open records', s.open],
        ['done', 'Completed records', s.done], ['completion', 'Completion %', s.completionPct],
        ['averageProgress', 'Average progress', s.avgProgress]]) });
  });
}
module.exports = router;
