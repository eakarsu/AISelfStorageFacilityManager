'use strict';
// Offline feature-pack test: never calls a provider.
delete process.env.OPENROUTER_API_KEY;
delete process.env.OPENAI_API_KEY;
process.env.JWT_SECRET = process.env.JWT_SECRET || 'feature-pack-test-secret-0123456789abcdef';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
function load(name, rel) { try { return require(name); } catch { return require(path.join(__dirname, rel, name)); } }
const express = load('express', '..');
const jwt = load('jsonwebtoken', '..');
const router = require('../server/routes/featurePack.js');

async function withServer(fn) {
  const app = express(); app.use(express.json()); app.use('/api/feature-pack', router);
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}/api/feature-pack`;
  const token = jwt.sign({ id: 7, email: 'test@example.com' }, process.env.JWT_SECRET);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  try { await fn(base, headers); } finally { server.close(); }
}
test('tasks require auth and support create/list/search/update plus export', async () => {
  await withServer(async (base, headers) => {
    assert.equal((await fetch(`${base}/tasks`)).status, 401);
    const created = await (await fetch(`${base}/tasks`, { method: 'POST', headers, body: JSON.stringify({ title: 'Inspect unit A12 humidity', priority: 'high' }) })).json();
    assert.equal(created.task.title, 'Inspect unit A12 humidity');
    assert.equal(created.task.flagged, false); assert.equal(created.task.progress, 0);
    const found = await (await fetch(`${base}/tasks?search=humidity`, { headers })).json();
    assert.equal(found.count, 1);
    const updated = await (await fetch(`${base}/tasks/${created.task.id}`, { method: 'PUT', headers, body: JSON.stringify({ status: 'done', progress: 100 }) })).json();
    assert.equal(updated.task.status, 'done');
    const csv = await (await fetch(`${base}/export/csv`, { headers })).text();
    assert.ok(csv.includes('title') && csv.includes('Inspect unit A12 humidity'));
    const json = await (await fetch(`${base}/export/json`, { headers })).json();
    assert.equal(json.count, 1);
  });
});
test('domain helpers return labelled deterministic fallback preserving falsy values', async () => {
  await withServer(async (base, headers) => {
    await fetch(`${base}/tasks`, { method: 'POST', headers, body: JSON.stringify({ title: 'Inspect unit A12 humidity' }) });
    for (const slug of ['occupancy-forecast','churn-risk','pricing-hint']) {
      const body = await (await fetch(`${base}/ai/${slug}`, { method: 'POST', headers, body: '{}' })).json();
      assert.equal(body.aiGenerated, false, slug); assert.equal(body.providerCalled, false, slug);
      assert.ok(body.fallbackLabel && body.sections.length >= 3, slug);
    }
  });
});
