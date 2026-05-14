import React from 'react';

function renderValue(val) {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'number') return val.toLocaleString();
  if (Array.isArray(val)) {
    return (
      <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
        {val.map((item, i) => (
          <li key={i} style={{ marginBottom: 2 }}>
            {typeof item === 'object' ? JSON.stringify(item) : String(item)}
          </li>
        ))}
      </ul>
    );
  }
  return String(val);
}

function AIOutput({ data, loading, title }) {
  if (loading) {
    return (
      <div className="ai-output-container">
        <div className="ai-output-header">
          <span className="ai-badge">AI</span>
          <h3>{title || 'AI Analysis'}</h3>
        </div>
        <div className="ai-loading">
          <div className="spinner"></div>
          <span>Analyzing data with AI...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Handle new structured format {success, result, model}
  const result = data?.result;
  const model = data?.model || 'AI';

  // Fallback to old format
  if (!result) {
    const content = data?.choices?.[0]?.message?.content || data?.raw || 'No analysis available.';
    return (
      <div className="ai-output-container">
        <div className="ai-output-header">
          <span className="ai-badge">AI</span>
          <h3>{title || 'AI Analysis'}</h3>
        </div>
        <div className="ai-output-body" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
          {content}
        </div>
      </div>
    );
  }

  const fieldLabels = {
    summary: 'Summary',
    risk_level: 'Risk Level',
    overall_recommendation: 'Recommendation',
    revenue_impact: 'Revenue Impact',
    overdue_count: 'Overdue Count',
    collection_recommendations: 'Collection Recommendations',
    revenue_insights: 'Revenue Insights',
    occupancyRate: 'Occupancy Rate',
    total: 'Total Units',
    occupied: 'Occupied',
    available: 'Available',
  };

  return (
    <div className="ai-output-container">
      <div className="ai-output-header">
        <span className="ai-badge">AI</span>
        <h3>{title || 'AI Analysis'}</h3>
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#94a3b8' }}>
          {model}
        </span>
      </div>
      <div className="ai-output-body">
        {result.summary && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f0f9ff', borderRadius: 8, borderLeft: '4px solid #0ea5e9' }}>
            <strong>Summary</strong>
            <p style={{ margin: '4px 0 0', color: '#374151' }}>{result.summary}</p>
          </div>
        )}
        {Object.entries(result)
          .filter(([k]) => k !== 'summary')
          .map(([key, val]) => (
            <div key={key} style={{ marginBottom: 12, padding: '10px 12px', background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                {fieldLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </div>
              <div style={{ fontSize: 14, color: '#1e293b' }}>{renderValue(val)}</div>
            </div>
          ))}
      </div>
    </div>
  );
}

export default AIOutput;
