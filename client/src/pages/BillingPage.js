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
  const [overdueList, setOverdueList] = useState([]);
  const [showOverdue, setShowOverdue] = useState(false);
  const [dunningMsg, setDunningMsg] = useState('');

  const load = async () => {
    const res = await axios.get(`${API}/billing`);
    setRecords(res.data.data || res.data);
  };

  useEffect(() => { load(); }, []);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await axios.post(`${API}/ai/billing-insights`, {}, authHeaders);
      setAiData(res.data);
    } catch (err) {
      setAiData({ result: { summary: 'Error: ' + (err.response?.data?.error || err.message) } });
    }
    setAiLoading(false);
  };

  const loadOverdueList = async () => {
    try {
      const res = await axios.get(`${API}/billing/overdue-list`, authHeaders);
      setOverdueList(res.data.data || []);
      setShowOverdue(true);
    } catch (err) {
      setDunningMsg('Error loading overdue list');
    }
  };

  const flagOverdue = async (id) => {
    try {
      const res = await axios.post(`${API}/billing/${id}/flag-overdue`, {}, authHeaders);
      setDunningMsg(`Dunning event: ${res.data.dunningStage} (${res.data.daysOverdue} days overdue)`);
      loadOverdueList();
      setTimeout(() => setDunningMsg(''), 4000);
    } catch (err) {
      setDunningMsg('Error: ' + (err.response?.data?.error || err.message));
    }
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
          <button className="btn btn-blue" onClick={loadOverdueList} style={{ background: '#ef4444', borderColor: '#ef4444' }}>Overdue Accounts</button>
          <button className="btn btn-blue" onClick={() => { setFormData(emptyRecord); setEditItem(null); setShowForm(true); }}>+ New Record</button>
        </div>
      </div>

      {dunningMsg && (
        <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, padding: '10px 16px', marginBottom: 12, fontSize: 14 }}>
          {dunningMsg}
        </div>
      )}

      {showOverdue && (
        <div style={{ background: '#fff', border: '1px solid #ef4444', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, color: '#991b1b' }}>Overdue Accounts ({overdueList.length})</h3>
            <button onClick={() => setShowOverdue(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#fef2f2' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Tenant</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Amount</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Due Date</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Dunning Status</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {overdueList.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #fee2e2' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600 }}>{r.tenant_name}</td>
                  <td style={{ padding: '8px 12px' }}>${parseFloat(r.amount).toFixed(2)}</td>
                  <td style={{ padding: '8px 12px', color: '#ef4444' }}>{new Date(r.due_date).toLocaleDateString()}</td>
                  <td style={{ padding: '8px 12px' }}>
                    {r.dunning_stage ? (
                      <span style={{ background: r.dunning_stage === 'lock' ? '#ef4444' : r.dunning_stage === 'final_notice' ? '#f59e0b' : '#3b82f6', color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                        {r.dunning_stage.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    ) : <span style={{ color: '#94a3b8' }}>No dunning</span>}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <button onClick={() => flagOverdue(r.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
                      Flag Overdue
                    </button>
                  </td>
                </tr>
              ))}
              {overdueList.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 16, textAlign: 'center', color: '#94a3b8' }}>No overdue accounts</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

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
