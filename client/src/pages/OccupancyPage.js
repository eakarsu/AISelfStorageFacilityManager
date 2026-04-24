import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from '../components/Modal';
import AIOutput from '../components/AIOutput';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const emptyForecast = { forecast_date: '', predicted_occupancy: '', actual_occupancy: '', unit_type: 'small', confidence_score: '', notes: '' };

function OccupancyPage({ token }) {
  const [forecasts, setForecasts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState(emptyForecast);
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const load = async () => {
    const res = await axios.get(`${API}/occupancy`);
    setForecasts(res.data);
  };

  useEffect(() => { load(); }, []);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await axios.post(`${API}/ai/occupancy-forecast`);
      setAiData(res.data);
    } catch (err) {
      setAiData({ choices: [{ message: { content: 'Error: ' + (err.response?.data?.error || err.message) } }] });
    }
    setAiLoading(false);
  };

  const handleSave = async () => {
    if (editItem) {
      await axios.put(`${API}/occupancy/${editItem.id}`, formData);
    } else {
      await axios.post(`${API}/occupancy`, formData);
    }
    setShowForm(false); setEditItem(null); setFormData(emptyForecast); load();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this forecast?')) {
      await axios.delete(`${API}/occupancy/${id}`);
      setSelected(null); load();
    }
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setFormData({ ...item, forecast_date: item.forecast_date?.split('T')[0] });
    setShowForm(true); setSelected(null);
  };

  const getConfBadge = (score) => {
    if (!score) return <span className="badge badge-gray">N/A</span>;
    const s = parseFloat(score);
    if (s >= 85) return <span className="badge badge-green">{s}%</span>;
    if (s >= 70) return <span className="badge badge-yellow">{s}%</span>;
    return <span className="badge badge-red">{s}%</span>;
  };

  return (
    <div>
      <div className="page-header">
        <h1>Occupancy Forecasting</h1>
        <div className="header-actions">
          <button className="btn btn-purple" onClick={runAI}>🤖 AI Forecast</button>
          <button className="btn btn-blue" onClick={() => { setFormData(emptyForecast); setEditItem(null); setShowForm(true); }}>+ New Forecast</button>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr><th>Date</th><th>Unit Type</th><th>Predicted</th><th>Actual</th><th>Confidence</th><th>Notes</th></tr>
          </thead>
          <tbody>
            {forecasts.map(f => (
              <tr key={f.id} onClick={() => setSelected(f)}>
                <td style={{ fontWeight: 600 }}>{new Date(f.forecast_date).toLocaleDateString()}</td>
                <td>{f.unit_type}</td>
                <td>{parseFloat(f.predicted_occupancy).toFixed(1)}%</td>
                <td>{f.actual_occupancy ? `${parseFloat(f.actual_occupancy).toFixed(1)}%` : '—'}</td>
                <td>{getConfBadge(f.confidence_score)}</td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AIOutput data={aiData} loading={aiLoading} title="AI Occupancy Forecast" />

      {selected && (
        <Modal title="Forecast Details" onClose={() => setSelected(null)}>
          <div className="detail-grid">
            <div className="detail-item"><label>Forecast Date</label><div className="value">{new Date(selected.forecast_date).toLocaleDateString()}</div></div>
            <div className="detail-item"><label>Unit Type</label><div className="value">{selected.unit_type}</div></div>
            <div className="detail-item"><label>Predicted Occupancy</label><div className="value">{parseFloat(selected.predicted_occupancy).toFixed(1)}%</div></div>
            <div className="detail-item"><label>Actual Occupancy</label><div className="value">{selected.actual_occupancy ? `${parseFloat(selected.actual_occupancy).toFixed(1)}%` : 'Pending'}</div></div>
            <div className="detail-item"><label>Confidence Score</label><div className="value">{getConfBadge(selected.confidence_score)}</div></div>
            <div className="detail-item"><label>Accuracy</label><div className="value">{selected.actual_occupancy ? `${Math.abs(parseFloat(selected.predicted_occupancy) - parseFloat(selected.actual_occupancy)).toFixed(1)}% variance` : 'Pending'}</div></div>
          </div>
          {selected.notes && <div className="detail-item" style={{ marginBottom: 16 }}><label>Notes</label><div className="value">{selected.notes}</div></div>}
          <div className="detail-actions">
            <button className="btn btn-blue btn-sm" onClick={() => handleEdit(selected)}>Edit</button>
            <button className="btn btn-red btn-sm" onClick={() => handleDelete(selected.id)}>Delete</button>
          </div>
        </Modal>
      )}

      {showForm && (
        <Modal title={editItem ? 'Edit Forecast' : 'New Forecast'} onClose={() => { setShowForm(false); setEditItem(null); }}>
          <div className="form-row">
            <div className="form-group">
              <label>Forecast Date</label>
              <input type="date" value={formData.forecast_date} onChange={e => setFormData({...formData, forecast_date: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Unit Type</label>
              <select value={formData.unit_type} onChange={e => setFormData({...formData, unit_type: e.target.value})}>
                <option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option><option value="extra-large">Extra Large</option><option value="vehicle">Vehicle</option>
              </select>
            </div>
            <div className="form-group">
              <label>Predicted Occupancy (%)</label>
              <input type="number" step="0.1" value={formData.predicted_occupancy} onChange={e => setFormData({...formData, predicted_occupancy: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Actual Occupancy (%)</label>
              <input type="number" step="0.1" value={formData.actual_occupancy || ''} onChange={e => setFormData({...formData, actual_occupancy: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Confidence Score (%)</label>
              <input type="number" step="0.1" value={formData.confidence_score} onChange={e => setFormData({...formData, confidence_score: e.target.value})} />
            </div>
            <div className="form-group full-width">
              <label>Notes</label>
              <textarea value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Forecast notes..." />
            </div>
          </div>
          <div className="detail-actions" style={{ marginTop: 20 }}>
            <button className="btn btn-blue" onClick={handleSave}>{editItem ? 'Update' : 'Create'}</button>
            <button className="btn btn-outline" onClick={() => { setShowForm(false); setEditItem(null); }}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default OccupancyPage;
