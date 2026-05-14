import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from '../components/Modal';
import AIOutput from '../components/AIOutput';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const emptyTenant = { first_name: '', last_name: '', email: '', phone: '', unit_number: '', lease_start: '', lease_end: '', emergency_contact: '', id_verified: false, notes: '' };

function TenantsPage({ token }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState(emptyTenant);
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const load = async () => { const res = await axios.get(`${API}/tenants`); setItems(res.data.data || res.data); };
  useEffect(() => { load(); }, []);

  const runAI = async () => {
    setAiLoading(true);
    try { const res = await axios.post(`${API}/ai/tenant-analysis`); setAiData(res.data); }
    catch (err) { setAiData({ result: { summary: 'Error: ' + (err.response?.data?.error || err.message) } }); }
    setAiLoading(false);
  };

  const handleSave = async () => {
    if (editItem) await axios.put(`${API}/tenants/${editItem.id}`, formData);
    else await axios.post(`${API}/tenants`, formData);
    setShowForm(false); setEditItem(null); setFormData(emptyTenant); load();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this tenant?')) { await axios.delete(`${API}/tenants/${id}`); setSelected(null); load(); }
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setFormData({ ...item, lease_start: item.lease_start?.split('T')[0], lease_end: item.lease_end?.split('T')[0] });
    setShowForm(true); setSelected(null);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Tenant Management</h1>
        <div className="header-actions">
          <button className="btn btn-purple" onClick={runAI}>🤖 AI Tenant Analysis</button>
          <button className="btn btn-blue" onClick={() => { setFormData(emptyTenant); setEditItem(null); setShowForm(true); }}>+ New Tenant</button>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Unit</th><th>Lease End</th><th>ID Verified</th></tr></thead>
          <tbody>
            {items.map(t => (
              <tr key={t.id} onClick={() => setSelected(t)}>
                <td style={{ fontWeight: 600 }}>{t.first_name} {t.last_name}</td>
                <td>{t.email}</td>
                <td>{t.phone}</td>
                <td>{t.unit_number}</td>
                <td>{t.lease_end ? new Date(t.lease_end).toLocaleDateString() : '—'}</td>
                <td>{t.id_verified ? <span className="badge badge-green">Verified</span> : <span className="badge badge-yellow">Pending</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AIOutput data={aiData} loading={aiLoading} title="AI Tenant Analysis" />

      {selected && (
        <Modal title={`${selected.first_name} ${selected.last_name}`} onClose={() => setSelected(null)}>
          <div className="detail-grid">
            <div className="detail-item"><label>First Name</label><div className="value">{selected.first_name}</div></div>
            <div className="detail-item"><label>Last Name</label><div className="value">{selected.last_name}</div></div>
            <div className="detail-item"><label>Email</label><div className="value">{selected.email}</div></div>
            <div className="detail-item"><label>Phone</label><div className="value">{selected.phone}</div></div>
            <div className="detail-item"><label>Unit</label><div className="value">{selected.unit_number}</div></div>
            <div className="detail-item"><label>ID Verified</label><div className="value">{selected.id_verified ? 'Yes' : 'No'}</div></div>
            <div className="detail-item"><label>Lease Start</label><div className="value">{selected.lease_start ? new Date(selected.lease_start).toLocaleDateString() : 'N/A'}</div></div>
            <div className="detail-item"><label>Lease End</label><div className="value">{selected.lease_end ? new Date(selected.lease_end).toLocaleDateString() : 'N/A'}</div></div>
            <div className="detail-item"><label>Emergency Contact</label><div className="value">{selected.emergency_contact || 'N/A'}</div></div>
          </div>
          {selected.notes && <div className="detail-item" style={{ marginBottom: 16 }}><label>Notes</label><div className="value">{selected.notes}</div></div>}
          <div className="detail-actions">
            <button className="btn btn-blue btn-sm" onClick={() => handleEdit(selected)}>Edit</button>
            <button className="btn btn-red btn-sm" onClick={() => handleDelete(selected.id)}>Delete</button>
          </div>
        </Modal>
      )}

      {showForm && (
        <Modal title={editItem ? 'Edit Tenant' : 'New Tenant'} onClose={() => { setShowForm(false); setEditItem(null); }}>
          <div className="form-row">
            <div className="form-group"><label>First Name</label><input value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} /></div>
            <div className="form-group"><label>Last Name</label><input value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} /></div>
            <div className="form-group"><label>Email</label><input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
            <div className="form-group"><label>Phone</label><input value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
            <div className="form-group"><label>Unit Number</label><input value={formData.unit_number || ''} onChange={e => setFormData({...formData, unit_number: e.target.value})} /></div>
            <div className="form-group"><label>Emergency Contact</label><input value={formData.emergency_contact || ''} onChange={e => setFormData({...formData, emergency_contact: e.target.value})} /></div>
            <div className="form-group"><label>Lease Start</label><input type="date" value={formData.lease_start || ''} onChange={e => setFormData({...formData, lease_start: e.target.value})} /></div>
            <div className="form-group"><label>Lease End</label><input type="date" value={formData.lease_end || ''} onChange={e => setFormData({...formData, lease_end: e.target.value})} /></div>
            <div className="form-group full-width"><label>Notes</label><textarea value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} /></div>
          </div>
          <div className="checkbox-group"><input type="checkbox" checked={formData.id_verified} onChange={e => setFormData({...formData, id_verified: e.target.checked})} /><label>ID Verified</label></div>
          <div className="detail-actions" style={{ marginTop: 20 }}>
            <button className="btn btn-blue" onClick={handleSave}>{editItem ? 'Update' : 'Create'}</button>
            <button className="btn btn-outline" onClick={() => { setShowForm(false); setEditItem(null); }}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default TenantsPage;
