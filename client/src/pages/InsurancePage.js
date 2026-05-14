import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from '../components/Modal';
import AIOutput from '../components/AIOutput';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const emptyPolicy = { tenant_name: '', unit_number: '', provider: '', policy_number: '', coverage_amount: '', monthly_premium: '', start_date: '', end_date: '', status: 'active', coverage_type: 'basic' };

function InsurancePage({ token }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState(emptyPolicy);
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const load = async () => { const res = await axios.get(`${API}/insurance`); setItems(res.data.data || res.data); };
  useEffect(() => { load(); }, []);

  const runAI = async () => {
    setAiLoading(true);
    try { const res = await axios.post(`${API}/ai/insurance-analysis`); setAiData(res.data); }
    catch (err) { setAiData({ result: { summary: 'Error: ' + (err.response?.data?.error || err.message) } }); }
    setAiLoading(false);
  };

  const handleSave = async () => {
    if (editItem) await axios.put(`${API}/insurance/${editItem.id}`, formData);
    else await axios.post(`${API}/insurance`, formData);
    setShowForm(false); setEditItem(null); setFormData(emptyPolicy); load();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this policy?')) { await axios.delete(`${API}/insurance/${id}`); setSelected(null); load(); }
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setFormData({ ...item, start_date: item.start_date?.split('T')[0], end_date: item.end_date?.split('T')[0] });
    setShowForm(true); setSelected(null);
  };

  const statusBadge = (s) => {
    const map = { active: 'badge-green', expired: 'badge-red', cancelled: 'badge-gray' };
    return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <h1>Insurance Tracking</h1>
        <div className="header-actions">
          <button className="btn btn-purple" onClick={runAI}>🤖 AI Insurance Analysis</button>
          <button className="btn btn-blue" onClick={() => { setFormData(emptyPolicy); setEditItem(null); setShowForm(true); }}>+ New Policy</button>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Tenant</th><th>Unit</th><th>Provider</th><th>Coverage</th><th>Premium</th><th>Expires</th><th>Status</th></tr></thead>
          <tbody>
            {items.map(p => (
              <tr key={p.id} onClick={() => setSelected(p)}>
                <td style={{ fontWeight: 600 }}>{p.tenant_name}</td>
                <td>{p.unit_number}</td>
                <td>{p.provider}</td>
                <td>${parseFloat(p.coverage_amount).toLocaleString()}</td>
                <td>${parseFloat(p.monthly_premium).toFixed(2)}/mo</td>
                <td>{p.end_date ? new Date(p.end_date).toLocaleDateString() : '—'}</td>
                <td>{statusBadge(p.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AIOutput data={aiData} loading={aiLoading} title="AI Insurance Analysis" />

      {selected && (
        <Modal title={`Policy - ${selected.tenant_name}`} onClose={() => setSelected(null)}>
          <div className="detail-grid">
            <div className="detail-item"><label>Tenant</label><div className="value">{selected.tenant_name}</div></div>
            <div className="detail-item"><label>Unit</label><div className="value">{selected.unit_number}</div></div>
            <div className="detail-item"><label>Provider</label><div className="value">{selected.provider}</div></div>
            <div className="detail-item"><label>Policy #</label><div className="value">{selected.policy_number}</div></div>
            <div className="detail-item"><label>Coverage</label><div className="value">${parseFloat(selected.coverage_amount).toLocaleString()}</div></div>
            <div className="detail-item"><label>Monthly Premium</label><div className="value">${parseFloat(selected.monthly_premium).toFixed(2)}</div></div>
            <div className="detail-item"><label>Coverage Type</label><div className="value">{selected.coverage_type?.replace(/_/g, ' ')}</div></div>
            <div className="detail-item"><label>Status</label><div className="value">{statusBadge(selected.status)}</div></div>
            <div className="detail-item"><label>Start Date</label><div className="value">{new Date(selected.start_date).toLocaleDateString()}</div></div>
            <div className="detail-item"><label>End Date</label><div className="value">{new Date(selected.end_date).toLocaleDateString()}</div></div>
          </div>
          <div className="detail-actions">
            <button className="btn btn-blue btn-sm" onClick={() => handleEdit(selected)}>Edit</button>
            <button className="btn btn-red btn-sm" onClick={() => handleDelete(selected.id)}>Delete</button>
          </div>
        </Modal>
      )}

      {showForm && (
        <Modal title={editItem ? 'Edit Policy' : 'New Policy'} onClose={() => { setShowForm(false); setEditItem(null); }}>
          <div className="form-row">
            <div className="form-group"><label>Tenant Name</label><input value={formData.tenant_name} onChange={e => setFormData({...formData, tenant_name: e.target.value})} /></div>
            <div className="form-group"><label>Unit Number</label><input value={formData.unit_number || ''} onChange={e => setFormData({...formData, unit_number: e.target.value})} /></div>
            <div className="form-group"><label>Provider</label><input value={formData.provider || ''} onChange={e => setFormData({...formData, provider: e.target.value})} /></div>
            <div className="form-group"><label>Policy Number</label><input value={formData.policy_number || ''} onChange={e => setFormData({...formData, policy_number: e.target.value})} /></div>
            <div className="form-group"><label>Coverage Amount ($)</label><input type="number" step="0.01" value={formData.coverage_amount || ''} onChange={e => setFormData({...formData, coverage_amount: e.target.value})} /></div>
            <div className="form-group"><label>Monthly Premium ($)</label><input type="number" step="0.01" value={formData.monthly_premium || ''} onChange={e => setFormData({...formData, monthly_premium: e.target.value})} /></div>
            <div className="form-group"><label>Start Date</label><input type="date" value={formData.start_date || ''} onChange={e => setFormData({...formData, start_date: e.target.value})} /></div>
            <div className="form-group"><label>End Date</label><input type="date" value={formData.end_date || ''} onChange={e => setFormData({...formData, end_date: e.target.value})} /></div>
            <div className="form-group"><label>Status</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option value="active">Active</option><option value="expired">Expired</option><option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="form-group"><label>Coverage Type</label>
              <select value={formData.coverage_type} onChange={e => setFormData({...formData, coverage_type: e.target.value})}>
                <option value="basic">Basic</option><option value="standard">Standard</option><option value="premium">Premium</option><option value="business">Business</option><option value="commercial">Commercial</option><option value="vehicle">Vehicle</option><option value="fine_art">Fine Art</option><option value="wine_collection">Wine Collection</option>
              </select>
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

export default InsurancePage;
