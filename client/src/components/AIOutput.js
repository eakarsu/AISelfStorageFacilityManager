import React, { useEffect, useState } from 'react';
import FormattedAIReport from './FormattedAIReport';

const endpoints = {
  'AI Pricing Analysis': 'pricing-analysis',
  'AI Occupancy Forecast': 'occupancy-forecast',
  'AI Climate Optimization': 'climate-optimization',
  'AI Security Analysis': 'security-analysis',
  'AI Billing Insights': 'billing-insights',
  'AI Tenant Analysis': 'tenant-analysis',
  'AI Maintenance Analysis': 'maintenance-analysis',
  'AI Access Pattern Analysis': 'access-analysis',
  'AI Insurance Analysis': 'insurance-analysis',
  'AI Move-In/Out Analysis': 'moveio-analysis',
  'AI Revenue Analysis': 'revenue-analysis',
  'Unit Sizing Recommendation': 'unit-sizing-recommendation',
  'Churn Prediction': 'churn-prediction',
  'Security Alert Analysis': 'security-alert-analysis',
  'Late Payment Risk': 'late-payment-risk',
};

export default function AIOutput({ data, loading, title }) {
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const endpoint = endpoints[title];

  useEffect(() => {
    if (!endpoint) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    let active = true;
    const api = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
    fetch(`${api}/ai/results/${endpoint}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(response => response.ok ? response.json() : { items: [] })
      .then(body => { if (active) setHistory(body.items || []); })
      .catch(() => { if (active) setHistory([]); });
    return () => { active = false; };
  }, [endpoint, data]);

  return <>
    <FormattedAIReport response={data} loading={loading} title={title || 'AI Analysis'} />
    {history.length > 0 && <section className="ai-history">
      <h2>Saved {title || 'AI'} reports</h2>
      {history.map(item => <button type="button" className="ai-history-row" key={item.id} onClick={() => setSelected(item)}>
        <span>{new Date(item.created_at).toLocaleString()}</span><span>View report</span>
      </button>)}
      {selected && <FormattedAIReport response={selected.result} title={`Saved ${title || 'AI'} report`} />}
    </section>}
  </>;
}
