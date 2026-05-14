import React, { useState } from 'react';
import axios from 'axios';
import AIOutput from '../components/AIOutput';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

function ChurnPredictionPage({ token }) {
  const [horizonDays, setHorizonDays] = useState(30);
  const [includeRetentionOffers, setIncludeRetentionOffers] = useState(true);
  const [aiData, setAiData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const run = async () => {
    setLoading(true); setError(''); setAiData(null);
    try {
      const res = await axios.post(`${API}/ai/churn-prediction`, {
        horizonDays: Number(horizonDays),
        includeRetentionOffers,
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
        <h1>AI Churn Prediction</h1>
        <p>At-risk tenants with retention offers.</p>
      </div>

      <div className="card" style={{ padding: 20, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label>Horizon (days)</label>
            <input type="number" min="1" max="180" className="form-control" value={horizonDays} onChange={e => setHorizonDays(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Include retention offers?</label>
            <select className="form-control" value={String(includeRetentionOffers)} onChange={e => setIncludeRetentionOffers(e.target.value === 'true')}>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>

        {error && <div style={{ color: '#b91c1c', marginTop: 12 }}>{error}</div>}

        <button className="btn btn-purple" onClick={run} disabled={loading} style={{ marginTop: 16 }}>
          {loading ? 'Predicting...' : 'Predict Churn'}
        </button>
      </div>

      {(loading || aiData) && <AIOutput data={aiData} loading={loading} title="Churn Prediction" />}
    </div>
  );
}

export default ChurnPredictionPage;
