import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from '../components/Modal';
import AIOutput from '../components/AIOutput';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const emptyRecord = { category: 'rent', amount: '', description: '', transaction_date: '', payment_method: 'credit_card', tenant_name: '', unit_number: '', period_month: '', period_year: '' };

function RevenuePage({ token }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState(emptyRecord);
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const load = async () => { const res = await axios.get(`${API}/revenue`); setItems(res.data); };
  useEffect(() => { load(); }, []);

  const runAI = async () => {
    setAiLoading(true);
    try { const res = await axios.post(`${API}/ai/revenue-analysis`); setAiData(res.data); }
    catch (err) { setAiData({ choices: [{ message: { content: 'Error: ' + (err.response?.data?.error || err.message) } }] }); }
    setAiLoading(false);
  };

  const handleSave = async () => {
    if (editItem) await axios.put(`${API}/revenue/${editItem.id}`, formData);
    else await axios.post(`${API}/revenue`, formData);
    setShowForm(false); setEditItem(null); setFormData(emptyRecord); load();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this record?')) { await axios.delete(`${API}/revenue/${id}`); setSelected(null); load(); }
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setFormData({ ...item, transaction_date: item.transaction_date?.split('T')[0] });
    setShowForm(true); setSelected(null);
  };

  const catBadge = (c) => {
    const map = { rent: 'badge-blue', insurance: 'badge-purple', late_fees: 'badge-red', admin_fees: 'badge-yellow', merchandise: 'badge-green' };
    return <span className={`badge ${map[c] || 'badge-gray'}`}>{c?.replace(/_/g, ' ')}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <h1>Revenue Analytics</h1>
        <div className="header-actions">
          <button className="btn btn-purple" onClick={runAI}>🤖 AI Revenue Analysis</button>
          <button className="btn btn-blue" onClick={() => { setFormData(emptyRecord); setEditItem(null); setShowForm(true); }}>+ New Record</button>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Date</th><th>Category</th><th>Amount</th><th>Description</th><th>Tenant</th><th>Unit</th><th>Payment</th></tr></thead>
          <tbody>
            {items.map(r => (
              <tr key={r.id} onClick={() => setSelected(r)}>
                <td style={{ fontWeight: 600 }}>{new Date(r.transaction_date).toLocaleDateString()}</td>
                <td>{catBadge(r.category)}</td>
                <td>${parseFloat(r.amount).toFixed(2)}</td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</td>
                <td>{r.tenant_name || '—'}</td>
                <td>{r.unit_number || '—'}</td>
                <td>{r.payment_method?.replace(/_/g, ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AIOutput data={aiData} loading={aiLoading} title="AI Revenue Analysis" />

      {selected && (
        <Modal title="Revenue Record" onClose={() => setSelected(null)}>
          <div className="detail-grid">
            <div className="detail-item"><label>Category</label><div className="value">{catBadge(selected.category)}</div></div>
            <div className="detail-item"><label>Amount</label><div className="value">${parseFloat(selected.amount).toFixed(2)}</div></div>
            <div className="detail-item"><label>Date</label><div className="value">{new Date(selected.transaction_date).toLocaleDateString()}</div></div>
            <div className="detail-item"><label>Payment Method</label><div className="value">{selected.payment_method?.replace(/_/g, ' ')}</div></div>
            <div className="detail-item"><label>Tenant</label><div className="value">{selected.tenant_name || 'N/A'}</div></div>
            <div className="detail-item"><label>Unit</label><div className="value">{selected.unit_number || 'N/A'}</div></div>
            <div className="detail-item"><label>Period</label><div className="value">{selected.period_month}/{selected.period_year}</div></div>
          </div>
          {selected.description && <div className="detail-item" style={{ marginBottom: 16 }}><label>Description</label><div className="value">{selected.description}</div></div>}
          <div className="detail-actions">
            <button className="btn btn-blue btn-sm" onClick={() => handleEdit(selected)}>Edit</button>
            <button className="btn btn-red btn-sm" onClick={() => handleDelete(selected.id)}>Delete</button>
          </div>
        </Modal>
      )}

      {showForm && (
        <Modal title={editItem ? 'Edit Record' : 'New Revenue Record'} onClose={() => { setShowForm(false); setEditItem(null); }}>
          <div className="form-row">
            <div className="form-group"><label>Category</label>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                <option value="rent">Rent</option><option value="insurance">Insurance</option><option value="late_fees">Late Fees</option><option value="admin_fees">Admin Fees</option><option value="merchandise">Merchandise</option>
              </select>
            </div>
            <div className="form-group"><label>Amount ($)</label><input type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} /></div>
            <div className="form-group"><label>Transaction Date</label><input type="date" value={formData.transaction_date || ''} onChange={e => setFormData({...formData, transaction_date: e.target.value})} /></div>
            <div className="form-group"><label>Payment Method</label>
              <select value={formData.payment_method} onChange={e => setFormData({...formData, payment_method: e.target.value})}>
                <option value="credit_card">Credit Card</option><option value="bank_transfer">Bank Transfer</option><option value="paypal">PayPal</option><option value="cash">Cash</option><option value="check">Check</option>
              </select>
            </div>
            <div className="form-group"><label>Tenant Name</label><input value={formData.tenant_name || ''} onChange={e => setFormData({...formData, tenant_name: e.target.value})} /></div>
            <div className="form-group"><label>Unit Number</label><input value={formData.unit_number || ''} onChange={e => setFormData({...formData, unit_number: e.target.value})} /></div>
            <div className="form-group"><label>Period Month</label><input type="number" min="1" max="12" value={formData.period_month || ''} onChange={e => setFormData({...formData, period_month: e.target.value})} /></div>
            <div className="form-group"><label>Period Year</label><input type="number" value={formData.period_year || ''} onChange={e => setFormData({...formData, period_year: e.target.value})} /></div>
            <div className="form-group full-width"><label>Description</label><input value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
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

export default RevenuePage;
