import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from '../components/Modal';
import AIOutput from '../components/AIOutput';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const emptyRule = { rule_name: '', unit_type: 'small', base_price: '', demand_multiplier: '1.0', season: 'all', min_price: '', max_price: '', is_active: true };

function PricingPage({ token }) {
  const [rules, setRules] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState(emptyRule);
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const load = async () => {
    const res = await axios.get(`${API}/pricing`);
    setRules(res.data);
  };

  useEffect(() => { load(); }, []);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await axios.post(`${API}/ai/pricing-analysis`);
      setAiData(res.data);
    } catch (err) {
      setAiData({ choices: [{ message: { content: 'Error: ' + (err.response?.data?.error || err.message) } }] });
    }
    setAiLoading(false);
  };

  const handleSave = async () => {
    if (editItem) {
      await axios.put(`${API}/pricing/${editItem.id}`, formData);
    } else {
      await axios.post(`${API}/pricing`, formData);
    }
    setShowForm(false); setEditItem(null); setFormData(emptyRule); load();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this pricing rule?')) {
      await axios.delete(`${API}/pricing/${id}`);
      setSelected(null); load();
    }
  };

  const handleEdit = (item) => {
    setEditItem(item); setFormData(item); setShowForm(true); setSelected(null);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Dynamic Pricing</h1>
        <div className="header-actions">
          <button className="btn btn-purple" onClick={runAI}>🤖 AI Pricing Analysis</button>
          <button className="btn btn-blue" onClick={() => { setFormData(emptyRule); setEditItem(null); setShowForm(true); }}>+ New Rule</button>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr><th>Rule Name</th><th>Unit Type</th><th>Base Price</th><th>Multiplier</th><th>Season</th><th>Min</th><th>Max</th><th>Active</th></tr>
          </thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.id} onClick={() => setSelected(r)}>
                <td style={{ fontWeight: 600 }}>{r.rule_name}</td>
                <td>{r.unit_type}</td>
                <td>${parseFloat(r.base_price).toFixed(2)}</td>
                <td>{parseFloat(r.demand_multiplier).toFixed(2)}x</td>
                <td><span className={`badge ${r.season === 'summer' ? 'badge-yellow' : r.season === 'winter' ? 'badge-blue' : 'badge-gray'}`}>{r.season}</span></td>
                <td>${parseFloat(r.min_price).toFixed(2)}</td>
                <td>${parseFloat(r.max_price).toFixed(2)}</td>
                <td>{r.is_active ? <span className="badge badge-green">Active</span> : <span className="badge badge-red">Inactive</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AIOutput data={aiData} loading={aiLoading} title="AI Pricing Analysis" />

      {selected && (
        <Modal title={selected.rule_name} onClose={() => setSelected(null)}>
          <div className="detail-grid">
            <div className="detail-item"><label>Rule Name</label><div className="value">{selected.rule_name}</div></div>
            <div className="detail-item"><label>Unit Type</label><div className="value">{selected.unit_type}</div></div>
            <div className="detail-item"><label>Base Price</label><div className="value">${parseFloat(selected.base_price).toFixed(2)}</div></div>
            <div className="detail-item"><label>Demand Multiplier</label><div className="value">{parseFloat(selected.demand_multiplier).toFixed(2)}x</div></div>
            <div className="detail-item"><label>Season</label><div className="value">{selected.season}</div></div>
            <div className="detail-item"><label>Price Range</label><div className="value">${parseFloat(selected.min_price).toFixed(2)} - ${parseFloat(selected.max_price).toFixed(2)}</div></div>
            <div className="detail-item"><label>Active</label><div className="value">{selected.is_active ? 'Yes' : 'No'}</div></div>
            <div className="detail-item"><label>Effective Price</label><div className="value">${(parseFloat(selected.base_price) * parseFloat(selected.demand_multiplier)).toFixed(2)}</div></div>
          </div>
          <div className="detail-actions">
            <button className="btn btn-blue btn-sm" onClick={() => handleEdit(selected)}>Edit</button>
            <button className="btn btn-red btn-sm" onClick={() => handleDelete(selected.id)}>Delete</button>
          </div>
        </Modal>
      )}

      {showForm && (
        <Modal title={editItem ? 'Edit Pricing Rule' : 'New Pricing Rule'} onClose={() => { setShowForm(false); setEditItem(null); }}>
          <div className="form-row">
            <div className="form-group full-width">
              <label>Rule Name</label>
              <input value={formData.rule_name} onChange={e => setFormData({...formData, rule_name: e.target.value})} placeholder="e.g. Summer Peak Small" />
            </div>
            <div className="form-group">
              <label>Unit Type</label>
              <select value={formData.unit_type} onChange={e => setFormData({...formData, unit_type: e.target.value})}>
                <option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option><option value="extra-large">Extra Large</option><option value="vehicle">Vehicle</option>
              </select>
            </div>
            <div className="form-group">
              <label>Base Price ($)</label>
              <input type="number" step="0.01" value={formData.base_price} onChange={e => setFormData({...formData, base_price: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Demand Multiplier</label>
              <input type="number" step="0.01" value={formData.demand_multiplier} onChange={e => setFormData({...formData, demand_multiplier: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Season</label>
              <select value={formData.season} onChange={e => setFormData({...formData, season: e.target.value})}>
                <option value="all">All</option><option value="summer">Summer</option><option value="winter">Winter</option><option value="spring">Spring</option><option value="fall">Fall</option>
              </select>
            </div>
            <div className="form-group">
              <label>Min Price ($)</label>
              <input type="number" step="0.01" value={formData.min_price} onChange={e => setFormData({...formData, min_price: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Max Price ($)</label>
              <input type="number" step="0.01" value={formData.max_price} onChange={e => setFormData({...formData, max_price: e.target.value})} />
            </div>
          </div>
          <div className="checkbox-group">
            <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} />
            <label>Active</label>
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

export default PricingPage;
