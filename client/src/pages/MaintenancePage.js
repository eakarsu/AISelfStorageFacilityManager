import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from '../components/Modal';
import AIOutput from '../components/AIOutput';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const emptyRequest = { title: '', description: '', location: '', priority: 'medium', status: 'open', assigned_to: '', requested_by: '', estimated_cost: '', completed_date: '' };

function MaintenancePage({ token }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState(emptyRequest);
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const load = async () => { const res = await axios.get(`${API}/maintenance`); setItems(res.data); };
  useEffect(() => { load(); }, []);

  const runAI = async () => {
    setAiLoading(true);
    try { const res = await axios.post(`${API}/ai/maintenance-analysis`); setAiData(res.data); }
    catch (err) { setAiData({ choices: [{ message: { content: 'Error: ' + (err.response?.data?.error || err.message) } }] }); }
    setAiLoading(false);
  };

  const handleSave = async () => {
    if (editItem) await axios.put(`${API}/maintenance/${editItem.id}`, formData);
    else await axios.post(`${API}/maintenance`, formData);
    setShowForm(false); setEditItem(null); setFormData(emptyRequest); load();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this request?')) { await axios.delete(`${API}/maintenance/${id}`); setSelected(null); load(); }
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setFormData({ ...item, completed_date: item.completed_date?.split('T')[0] || '' });
    setShowForm(true); setSelected(null);
  };

  const priorityBadge = (p) => {
    const map = { low: 'badge-gray', medium: 'badge-yellow', high: 'badge-red', urgent: 'badge-purple' };
    return <span className={`badge ${map[p] || 'badge-gray'}`}>{p}</span>;
  };

  const statusBadge = (s) => {
    const map = { open: 'badge-yellow', in_progress: 'badge-blue', completed: 'badge-green', cancelled: 'badge-gray', scheduled: 'badge-purple' };
    return <span className={`badge ${map[s] || 'badge-gray'}`}>{s?.replace(/_/g, ' ')}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <h1>Maintenance Requests</h1>
        <div className="header-actions">
          <button className="btn btn-purple" onClick={runAI}>🤖 AI Maintenance Analysis</button>
          <button className="btn btn-blue" onClick={() => { setFormData(emptyRequest); setEditItem(null); setShowForm(true); }}>+ New Request</button>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Title</th><th>Location</th><th>Priority</th><th>Status</th><th>Assigned To</th><th>Est. Cost</th></tr></thead>
          <tbody>
            {items.map(r => (
              <tr key={r.id} onClick={() => setSelected(r)}>
                <td style={{ fontWeight: 600, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</td>
                <td>{r.location}</td>
                <td>{priorityBadge(r.priority)}</td>
                <td>{statusBadge(r.status)}</td>
                <td>{r.assigned_to || '—'}</td>
                <td>{r.estimated_cost ? `$${parseFloat(r.estimated_cost).toFixed(2)}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AIOutput data={aiData} loading={aiLoading} title="AI Maintenance Analysis" />

      {selected && (
        <Modal title="Maintenance Request" onClose={() => setSelected(null)}>
          <div className="detail-grid">
            <div className="detail-item"><label>Title</label><div className="value">{selected.title}</div></div>
            <div className="detail-item"><label>Location</label><div className="value">{selected.location}</div></div>
            <div className="detail-item"><label>Priority</label><div className="value">{priorityBadge(selected.priority)}</div></div>
            <div className="detail-item"><label>Status</label><div className="value">{statusBadge(selected.status)}</div></div>
            <div className="detail-item"><label>Assigned To</label><div className="value">{selected.assigned_to || 'Unassigned'}</div></div>
            <div className="detail-item"><label>Requested By</label><div className="value">{selected.requested_by}</div></div>
            <div className="detail-item"><label>Estimated Cost</label><div className="value">{selected.estimated_cost ? `$${parseFloat(selected.estimated_cost).toFixed(2)}` : 'TBD'}</div></div>
            <div className="detail-item"><label>Completed</label><div className="value">{selected.completed_date ? new Date(selected.completed_date).toLocaleDateString() : 'Pending'}</div></div>
          </div>
          {selected.description && <div className="detail-item" style={{ marginBottom: 16 }}><label>Description</label><div className="value">{selected.description}</div></div>}
          <div className="detail-actions">
            <button className="btn btn-blue btn-sm" onClick={() => handleEdit(selected)}>Edit</button>
            <button className="btn btn-red btn-sm" onClick={() => handleDelete(selected.id)}>Delete</button>
          </div>
        </Modal>
      )}

      {showForm && (
        <Modal title={editItem ? 'Edit Request' : 'New Request'} onClose={() => { setShowForm(false); setEditItem(null); }}>
          <div className="form-row">
            <div className="form-group full-width"><label>Title</label><input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Brief description of issue" /></div>
            <div className="form-group"><label>Location</label><input value={formData.location || ''} onChange={e => setFormData({...formData, location: e.target.value})} /></div>
            <div className="form-group"><label>Priority</label>
              <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="form-group"><label>Status</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option value="open">Open</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="form-group"><label>Assigned To</label><input value={formData.assigned_to || ''} onChange={e => setFormData({...formData, assigned_to: e.target.value})} /></div>
            <div className="form-group"><label>Requested By</label><input value={formData.requested_by || ''} onChange={e => setFormData({...formData, requested_by: e.target.value})} /></div>
            <div className="form-group"><label>Estimated Cost ($)</label><input type="number" step="0.01" value={formData.estimated_cost || ''} onChange={e => setFormData({...formData, estimated_cost: e.target.value})} /></div>
            <div className="form-group"><label>Completed Date</label><input type="date" value={formData.completed_date || ''} onChange={e => setFormData({...formData, completed_date: e.target.value})} /></div>
            <div className="form-group full-width"><label>Description</label><textarea value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
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

export default MaintenancePage;
