import React, { useState } from 'react';
import axios from 'axios';
import AIOutput from '../components/AIOutput';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

function LatePaymentRiskPage({ token }) {
  const [billsAhead, setBillsAhead] = useState(30);
  const [includeOutreach, setIncludeOutreach] = useState(true);
  const [aiData, setAiData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const run = async () => {
    setLoading(true); setError(''); setAiData(null);
    try {
      const res = await axios.post(`${API}/ai/late-payment-risk`, {
        daysAhead: Number(billsAhead),
        includeOutreachScripts: includeOutreach,
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
        <h1>AI Late Payment Risk</h1>
        <p>Bill-level late-payment risk with outreach scripts.</p>
      </div>

      <div className="card" style={{ padding: 20, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label>Look ahead (days)</label>
            <input type="number" min="1" max="120" className="form-control" value={billsAhead} onChange={e => setBillsAhead(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Include outreach scripts?</label>
            <select className="form-control" value={String(includeOutreach)} onChange={e => setIncludeOutreach(e.target.value === 'true')}>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>

        {error && <div style={{ color: '#b91c1c', marginTop: 12 }}>{error}</div>}

        <button className="btn btn-purple" onClick={run} disabled={loading} style={{ marginTop: 16 }}>
          {loading ? 'Scoring...' : 'Score Late-Payment Risk'}
        </button>
      </div>

      {(loading || aiData) && <AIOutput data={aiData} loading={loading} title="Late Payment Risk" />}
    </div>
  );
}

export default LatePaymentRiskPage;
