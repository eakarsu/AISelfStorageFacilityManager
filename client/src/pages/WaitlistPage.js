import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from '../components/Modal';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const emptyEntry = { first_name: '', last_name: '', email: '', phone: '', desired_unit_type: 'small', desired_size_sqft: '', climate_controlled: false, max_budget: '', notes: '', status: 'waiting' };

function WaitlistPage({ token }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState(emptyEntry);

  const load = async () => { const res = await axios.get(`${API}/waitlist`); setItems(res.data); };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (editItem) await axios.put(`${API}/waitlist/${editItem.id}`, formData);
    else await axios.post(`${API}/waitlist`, formData);
    setShowForm(false); setEditItem(null); setFormData(emptyEntry); load();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Remove from waitlist?')) { await axios.delete(`${API}/waitlist/${id}`); setSelected(null); load(); }
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setFormData({ ...item, notified_date: item.notified_date?.split('T')[0] });
    setShowForm(true); setSelected(null);
  };

  const getStatusBadge = (status) => {
    const map = { waiting: 'badge-yellow', contacted: 'badge-blue', offered: 'badge-purple', converted: 'badge-green', cancelled: 'badge-gray' };
    return map[status] || 'badge-gray';
  };

  return (
    <div>
      <div className="page-header">
        <h1>Waitlist Management</h1>
        <div className="header-actions">
          <button className="btn btn-blue" onClick={() => { setFormData(emptyEntry); setEditItem(null); setShowForm(true); }}>+ Add to Waitlist</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        {['waiting', 'contacted', 'offered', 'converted', 'cancelled'].map(status => (
          <div key={status} className="stat-card" style={{ padding: '12px 16px' }}>
            <div className="stat-card-label" style={{ textTransform: 'capitalize' }}>{status}</div>
            <div className="stat-card-value" style={{ fontSize: 24 }}>{items.filter(i => i.status === status).length}</div>
          </div>
        ))}
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Desired Type</th><th>Max Budget</th><th>Climate</th><th>Status</th></tr></thead>
          <tbody>
            {items.map(w => (
              <tr key={w.id} onClick={() => setSelected(w)}>
                <td style={{ fontWeight: 600 }}>{w.first_name} {w.last_name}</td>
                <td>{w.email}</td>
                <td>{w.phone}</td>
                <td style={{ textTransform: 'capitalize' }}>{w.desired_unit_type}</td>
                <td>{w.max_budget ? `$${parseFloat(w.max_budget).toFixed(2)}/mo` : '—'}</td>
                <td>{w.climate_controlled ? 'Yes' : 'No'}</td>
                <td><span className={`badge ${getStatusBadge(w.status)}`}>{w.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <Modal title={`${selected.first_name} ${selected.last_name}`} onClose={() => setSelected(null)}>
          <div className="detail-grid">
            <div className="detail-item"><label>First Name</label><div className="value">{selected.first_name}</div></div>
            <div className="detail-item"><label>Last Name</label><div className="value">{selected.last_name}</div></div>
            <div className="detail-item"><label>Email</label><div className="value">{selected.email}</div></div>
            <div className="detail-item"><label>Phone</label><div className="value">{selected.phone}</div></div>
            <div className="detail-item"><label>Desired Type</label><div className="value" style={{ textTransform: 'capitalize' }}>{selected.desired_unit_type}</div></div>
            <div className="detail-item"><label>Desired Size</label><div className="value">{selected.desired_size_sqft ? `${selected.desired_size_sqft} sqft` : 'Any'}</div></div>
            <div className="detail-item"><label>Climate Controlled</label><div className="value">{selected.climate_controlled ? 'Yes' : 'No'}</div></div>
            <div className="detail-item"><label>Max Budget</label><div className="value">{selected.max_budget ? `$${parseFloat(selected.max_budget).toFixed(2)}/mo` : 'N/A'}</div></div>
            <div className="detail-item"><label>Status</label><div className="value"><span className={`badge ${getStatusBadge(selected.status)}`}>{selected.status}</span></div></div>
            <div className="detail-item"><label>Added</label><div className="value">{new Date(selected.created_at).toLocaleDateString()}</div></div>
            {selected.notified_date && <div className="detail-item"><label>Last Notified</label><div className="value">{new Date(selected.notified_date).toLocaleDateString()}</div></div>}
          </div>
          {selected.notes && <div className="detail-item" style={{ marginBottom: 16 }}><label>Notes</label><div className="value">{selected.notes}</div></div>}
          <div className="detail-actions">
            <button className="btn btn-blue btn-sm" onClick={() => handleEdit(selected)}>Edit</button>
            <button className="btn btn-red btn-sm" onClick={() => handleDelete(selected.id)}>Delete</button>
          </div>
        </Modal>
      )}

      {showForm && (
        <Modal title={editItem ? 'Edit Waitlist Entry' : 'Add to Waitlist'} onClose={() => { setShowForm(false); setEditItem(null); }}>
          <div className="form-row">
            <div className="form-group"><label>First Name</label><input value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} /></div>
            <div className="form-group"><label>Last Name</label><input value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} /></div>
            <div className="form-group"><label>Email</label><input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
            <div className="form-group"><label>Phone</label><input value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
            <div className="form-group">
              <label>Desired Unit Type</label>
              <select value={formData.desired_unit_type} onChange={e => setFormData({...formData, desired_unit_type: e.target.value})}>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="extra-large">Extra Large</option>
                <option value="vehicle">Vehicle</option>
              </select>
            </div>
            <div className="form-group"><label>Desired Size (sqft)</label><input type="number" value={formData.desired_size_sqft || ''} onChange={e => setFormData({...formData, desired_size_sqft: e.target.value})} /></div>
            <div className="form-group"><label>Max Monthly Budget</label><input type="number" value={formData.max_budget || ''} onChange={e => setFormData({...formData, max_budget: e.target.value})} /></div>
            <div className="form-group">
              <label>Status</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option value="waiting">Waiting</option>
                <option value="contacted">Contacted</option>
                <option value="offered">Offered</option>
                <option value="converted">Converted</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="form-group full-width"><label>Notes</label><textarea value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} /></div>
          </div>
          <div className="checkbox-group"><input type="checkbox" checked={formData.climate_controlled} onChange={e => setFormData({...formData, climate_controlled: e.target.checked})} /><label>Needs Climate Control</label></div>
          <div className="detail-actions" style={{ marginTop: 20 }}>
            <button className="btn btn-blue" onClick={handleSave}>{editItem ? 'Update' : 'Add'}</button>
            <button className="btn btn-outline" onClick={() => { setShowForm(false); setEditItem(null); }}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default WaitlistPage;
