import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from '../components/Modal';
import AIOutput from '../components/AIOutput';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const emptyLog = { tenant_name: '', unit_number: '', access_type: 'gate_entry', access_method: 'keypad', access_time: '', granted: true, denied_reason: '' };

function AccessPage({ token }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState(emptyLog);
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const load = async () => { const res = await axios.get(`${API}/access`); setItems(res.data.data || res.data); };
  useEffect(() => { load(); }, []);

  const runAI = async () => {
    setAiLoading(true);
    try { const res = await axios.post(`${API}/ai/access-analysis`); setAiData(res.data); }
    catch (err) { setAiData({ result: { summary: 'Error: ' + (err.response?.data?.error || err.message) } }); }
    setAiLoading(false);
  };

  const handleSave = async () => {
    if (editItem) await axios.put(`${API}/access/${editItem.id}`, formData);
    else await axios.post(`${API}/access`, formData);
    setShowForm(false); setEditItem(null); setFormData(emptyLog); load();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this log?')) { await axios.delete(`${API}/access/${id}`); setSelected(null); load(); }
  };

  const handleEdit = (item) => { setEditItem(item); setFormData(item); setShowForm(true); setSelected(null); };

  return (
    <div>
      <div className="page-header">
        <h1>Access Logs</h1>
        <div className="header-actions">
          <button className="btn btn-purple" onClick={runAI}>🤖 AI Access Analysis</button>
          <button className="btn btn-blue" onClick={() => { setFormData(emptyLog); setEditItem(null); setShowForm(true); }}>+ New Log</button>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Time</th><th>Tenant</th><th>Unit</th><th>Type</th><th>Method</th><th>Status</th></tr></thead>
          <tbody>
            {items.map(l => (
              <tr key={l.id} onClick={() => setSelected(l)}>
                <td style={{ fontWeight: 600 }}>{new Date(l.access_time).toLocaleString()}</td>
                <td>{l.tenant_name}</td>
                <td>{l.unit_number}</td>
                <td>{l.access_type?.replace(/_/g, ' ')}</td>
                <td>{l.access_method}</td>
                <td>{l.granted ? <span className="badge badge-green">Granted</span> : <span className="badge badge-red">Denied</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AIOutput data={aiData} loading={aiLoading} title="AI Access Pattern Analysis" />

      {selected && (
        <Modal title="Access Log Details" onClose={() => setSelected(null)}>
          <div className="detail-grid">
            <div className="detail-item"><label>Tenant</label><div className="value">{selected.tenant_name}</div></div>
            <div className="detail-item"><label>Unit</label><div className="value">{selected.unit_number}</div></div>
            <div className="detail-item"><label>Access Type</label><div className="value">{selected.access_type?.replace(/_/g, ' ')}</div></div>
            <div className="detail-item"><label>Method</label><div className="value">{selected.access_method}</div></div>
            <div className="detail-item"><label>Time</label><div className="value">{new Date(selected.access_time).toLocaleString()}</div></div>
            <div className="detail-item"><label>Granted</label><div className="value">{selected.granted ? 'Yes' : 'No'}</div></div>
            {selected.denied_reason && <div className="detail-item"><label>Denied Reason</label><div className="value">{selected.denied_reason}</div></div>}
          </div>
          <div className="detail-actions">
            <button className="btn btn-blue btn-sm" onClick={() => handleEdit(selected)}>Edit</button>
            <button className="btn btn-red btn-sm" onClick={() => handleDelete(selected.id)}>Delete</button>
          </div>
        </Modal>
      )}

      {showForm && (
        <Modal title={editItem ? 'Edit Log' : 'New Access Log'} onClose={() => { setShowForm(false); setEditItem(null); }}>
          <div className="form-row">
            <div className="form-group"><label>Tenant Name</label><input value={formData.tenant_name} onChange={e => setFormData({...formData, tenant_name: e.target.value})} /></div>
            <div className="form-group"><label>Unit Number</label><input value={formData.unit_number || ''} onChange={e => setFormData({...formData, unit_number: e.target.value})} /></div>
            <div className="form-group"><label>Access Type</label>
              <select value={formData.access_type} onChange={e => setFormData({...formData, access_type: e.target.value})}>
                <option value="gate_entry">Gate Entry</option><option value="gate_exit">Gate Exit</option><option value="unit_open">Unit Open</option><option value="unit_close">Unit Close</option>
              </select>
            </div>
            <div className="form-group"><label>Access Method</label>
              <select value={formData.access_method} onChange={e => setFormData({...formData, access_method: e.target.value})}>
                <option value="keypad">Keypad</option><option value="card">Card</option><option value="app">App</option><option value="manual">Manual</option>
              </select>
            </div>
            <div className="form-group"><label>Denied Reason</label><input value={formData.denied_reason || ''} onChange={e => setFormData({...formData, denied_reason: e.target.value})} /></div>
          </div>
          <div className="checkbox-group"><input type="checkbox" checked={formData.granted} onChange={e => setFormData({...formData, granted: e.target.checked})} /><label>Access Granted</label></div>
          <div className="detail-actions" style={{ marginTop: 20 }}>
            <button className="btn btn-blue" onClick={handleSave}>{editItem ? 'Update' : 'Create'}</button>
            <button className="btn btn-outline" onClick={() => { setShowForm(false); setEditItem(null); }}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default AccessPage;
