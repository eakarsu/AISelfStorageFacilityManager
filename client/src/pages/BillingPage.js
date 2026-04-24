import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from '../components/Modal';
import AIOutput from '../components/AIOutput';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const emptyRecord = { tenant_name: '', tenant_email: '', unit_number: '', amount: '', due_date: '', status: 'pending', payment_method: 'credit_card', auto_pay: false };

function BillingPage({ token }) {
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState(emptyRecord);
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const load = async () => {
    const res = await axios.get(`${API}/billing`);
    setRecords(res.data);
  };

  useEffect(() => { load(); }, []);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await axios.post(`${API}/ai/billing-insights`);
      setAiData(res.data);
    } catch (err) {
      setAiData({ choices: [{ message: { content: 'Error: ' + (err.response?.data?.error || err.message) } }] });
    }
    setAiLoading(false);
  };

  const handleSave = async () => {
    if (editItem) {
      await axios.put(`${API}/billing/${editItem.id}`, formData);
    } else {
      await axios.post(`${API}/billing`, formData);
    }
    setShowForm(false); setEditItem(null); setFormData(emptyRecord); load();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this record?')) {
      await axios.delete(`${API}/billing/${id}`);
      setSelected(null); load();
    }
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setFormData({ ...item, due_date: item.due_date?.split('T')[0] });
    setShowForm(true); setSelected(null);
  };

  const statusBadge = (s) => {
    const map = { paid: 'badge-green', pending: 'badge-yellow', overdue: 'badge-red', cancelled: 'badge-gray' };
    return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <h1>Automated Billing</h1>
        <div className="header-actions">
          <button className="btn btn-purple" onClick={runAI}>🤖 AI Billing Insights</button>
          <button className="btn btn-blue" onClick={() => { setFormData(emptyRecord); setEditItem(null); setShowForm(true); }}>+ New Record</button>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr><th>Tenant</th><th>Unit</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Payment</th><th>Auto-Pay</th></tr>
          </thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id} onClick={() => setSelected(r)}>
                <td style={{ fontWeight: 600 }}>{r.tenant_name}</td>
                <td>{r.unit_number}</td>
                <td>${parseFloat(r.amount).toFixed(2)}</td>
                <td>{new Date(r.due_date).toLocaleDateString()}</td>
                <td>{statusBadge(r.status)}</td>
                <td>{r.payment_method?.replace(/_/g, ' ')}</td>
                <td>{r.auto_pay ? <span className="badge badge-green">Yes</span> : <span className="badge badge-gray">No</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AIOutput data={aiData} loading={aiLoading} title="AI Billing Insights" />

      {selected && (
        <Modal title={`Billing - ${selected.tenant_name}`} onClose={() => setSelected(null)}>
          <div className="detail-grid">
            <div className="detail-item"><label>Tenant Name</label><div className="value">{selected.tenant_name}</div></div>
            <div className="detail-item"><label>Email</label><div className="value">{selected.tenant_email}</div></div>
            <div className="detail-item"><label>Unit</label><div className="value">{selected.unit_number}</div></div>
            <div className="detail-item"><label>Amount</label><div className="value">${parseFloat(selected.amount).toFixed(2)}</div></div>
            <div className="detail-item"><label>Due Date</label><div className="value">{new Date(selected.due_date).toLocaleDateString()}</div></div>
            <div className="detail-item"><label>Status</label><div className="value">{statusBadge(selected.status)}</div></div>
            <div className="detail-item"><label>Payment Method</label><div className="value">{selected.payment_method?.replace(/_/g, ' ')}</div></div>
            <div className="detail-item"><label>Auto-Pay</label><div className="value">{selected.auto_pay ? 'Enabled' : 'Disabled'}</div></div>
          </div>
          <div className="detail-actions">
            <button className="btn btn-blue btn-sm" onClick={() => handleEdit(selected)}>Edit</button>
            <button className="btn btn-red btn-sm" onClick={() => handleDelete(selected.id)}>Delete</button>
          </div>
        </Modal>
      )}

      {showForm && (
        <Modal title={editItem ? 'Edit Billing Record' : 'New Billing Record'} onClose={() => { setShowForm(false); setEditItem(null); }}>
          <div className="form-row">
            <div className="form-group">
              <label>Tenant Name</label>
              <input value={formData.tenant_name} onChange={e => setFormData({...formData, tenant_name: e.target.value})} placeholder="Full name" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={formData.tenant_email || ''} onChange={e => setFormData({...formData, tenant_email: e.target.value})} placeholder="email@example.com" />
            </div>
            <div className="form-group">
              <label>Unit Number</label>
              <input value={formData.unit_number} onChange={e => setFormData({...formData, unit_number: e.target.value})} placeholder="e.g. A-101" />
            </div>
            <div className="form-group">
              <label>Amount ($)</label>
              <input type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Due Date</label>
              <input type="date" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option value="pending">Pending</option><option value="paid">Paid</option><option value="overdue">Overdue</option><option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="form-group">
              <label>Payment Method</label>
              <select value={formData.payment_method} onChange={e => setFormData({...formData, payment_method: e.target.value})}>
                <option value="credit_card">Credit Card</option><option value="bank_transfer">Bank Transfer</option><option value="paypal">PayPal</option><option value="cash">Cash</option><option value="check">Check</option>
              </select>
            </div>
          </div>
          <div className="checkbox-group">
            <input type="checkbox" checked={formData.auto_pay} onChange={e => setFormData({...formData, auto_pay: e.target.checked})} />
            <label>Auto-Pay Enabled</label>
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

export default BillingPage;
