import React, { useState } from 'react';
import axios from 'axios';
import AIOutput from '../components/AIOutput';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

function UnitSizingPage({ token }) {
  const [items, setItems] = useState('');
  const [budget, setBudget] = useState('');
  const [unitTypes, setUnitTypes] = useState('5x5,5x10,10x10,10x15,10x20,10x30');
  const [climateNeeded, setClimateNeeded] = useState(false);
  const [aiData, setAiData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const run = async () => {
    if (!items.trim()) {
      setError('Please describe the items to be stored.');
      return;
    }
    setLoading(true); setError(''); setAiData(null);
    try {
      const sizes = unitTypes.split(',').map(s => s.trim()).filter(Boolean);
      const res = await axios.post(`${API}/ai/unit-sizing-recommendation`, {
        items,
        budget: budget ? Number(budget) : undefined,
        availableSizes: sizes,
        climateControlNeeded: climateNeeded,
      }, { headers });
      setAiData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1>AI Unit Sizing</h1>
        <p>Recommend the right unit size from items, budget, and available sizes.</p>
      </div>

      <div className="card" style={{ padding: 20, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, marginBottom: 16 }}>
        <div className="form-group">
          <label>Items to store *</label>
          <textarea className="form-control" rows={5} value={items} onChange={e => setItems(e.target.value)} placeholder="e.g. 1-bedroom apartment: queen bed, sofa, dining table, ~30 boxes, no fragile items" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
          <div className="form-group">
            <label>Budget (monthly $)</label>
            <input type="number" min="0" className="form-control" value={budget} onChange={e => setBudget(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Climate control needed?</label>
            <select className="form-control" value={String(climateNeeded)} onChange={e => setClimateNeeded(e.target.value === 'true')}>
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </div>
        </div>
        <div className="form-group" style={{ marginTop: 12 }}>
          <label>Available unit types (comma separated)</label>
          <input type="text" className="form-control" value={unitTypes} onChange={e => setUnitTypes(e.target.value)} />
        </div>

        {error && <div style={{ color: '#b91c1c', marginTop: 12 }}>{error}</div>}

        <button className="btn btn-purple" onClick={run} disabled={loading} style={{ marginTop: 16 }}>
          {loading ? 'Recommending...' : 'Recommend Unit Size'}
        </button>
      </div>

      {(loading || aiData) && <AIOutput data={aiData} loading={loading} title="Unit Sizing Recommendation" />}
    </div>
  );
}

export default UnitSizingPage;
