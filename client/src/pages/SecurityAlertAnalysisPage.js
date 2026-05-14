import React, { useState } from 'react';
import axios from 'axios';
import AIOutput from '../components/AIOutput';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

function SecurityAlertAnalysisPage({ token }) {
  const [hoursBack, setHoursBack] = useState(72);
  const [includeResolved, setIncludeResolved] = useState(false);
  const [focusZones, setFocusZones] = useState('');
  const [aiData, setAiData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const run = async () => {
    setLoading(true); setError(''); setAiData(null);
    try {
      const res = await axios.post(`${API}/ai/security-alert-analysis`, {
        hours_back: Number(hoursBack),
        include_resolved: includeResolved,
        focus_zones: focusZones.split(',').map(s => s.trim()).filter(Boolean),
      }, { headers });
      setAiData(res.data);
    } catch (err) {
      if (err.response && err.response.status === 503) {
        setError(err.response.data?.error || 'AI service unavailable. Configure OPENROUTER_API_KEY on the server.');
      } else {
        setError(err.response?.data?.error || err.message);
      }
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1>AI Security Alert Analysis</h1>
        <p>Triage camera/alarm events; cluster threats and prioritize alerts.</p>
      </div>

      <div className="card" style={{ padding: 20, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label>Look back (hours)</label>
            <input type="number" min="1" max="720" className="form-control" value={hoursBack} onChange={e => setHoursBack(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Include resolved events?</label>
            <select className="form-control" value={String(includeResolved)} onChange={e => setIncludeResolved(e.target.value === 'true')}>
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Focus zones (comma-separated, optional)</label>
            <input type="text" className="form-control" placeholder="e.g. zone-A, gate-3" value={focusZones} onChange={e => setFocusZones(e.target.value)} />
          </div>
        </div>

        {error && <div style={{ color: '#b91c1c', marginTop: 12 }}>{error}</div>}

        <button className="btn btn-purple" onClick={run} disabled={loading} style={{ marginTop: 16 }}>
          {loading ? 'Analyzing...' : 'Analyze Security Alerts'}
        </button>
      </div>

      {(loading || aiData) && <AIOutput data={aiData} loading={loading} title="Security Alert Analysis" />}
    </div>
  );
}

export default SecurityAlertAnalysisPage;
