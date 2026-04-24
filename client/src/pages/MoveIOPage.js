import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from '../components/Modal';
import AIOutput from '../components/AIOutput';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const emptyActivity = { tenant_name: '', unit_number: '', activity_type: 'move_in', scheduled_date: '', completed_date: '', status: 'scheduled', requires_elevator: false, special_instructions: '', staff_assigned: '' };

function MoveIOPage({ token }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState(emptyActivity);
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const load = async () => { const res = await axios.get(`${API}/moveio`); setItems(res.data); };
  useEffect(() => { load(); }, []);

  const runAI = async () => {
    setAiLoading(true);
    try { const res = await axios.post(`${API}/ai/moveio-analysis`); setAiData(res.data); }
    catch (err) { setAiData({ choices: [{ message: { content: 'Error: ' + (err.response?.data?.error || err.message) } }] }); }
    setAiLoading(false);
  };

  const handleSave = async () => {
    if (editItem) await axios.put(`${API}/moveio/${editItem.id}`, formData);
    else await axios.post(`${API}/moveio`, formData);
    setShowForm(false); setEditItem(null); setFormData(emptyActivity); load();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this activity?')) { await axios.delete(`${API}/moveio/${id}`); setSelected(null); load(); }
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setFormData({ ...item, scheduled_date: item.scheduled_date?.split('T')[0], completed_date: item.completed_date?.split('T')[0] || '' });
    setShowForm(true); setSelected(null);
  };

  const typeBadge = (t) => t === 'move_in' ? <span className="badge badge-green">Move In</span> : <span className="badge badge-red">Move Out</span>;
  const statusBadge = (s) => {
    const map = { scheduled: 'badge-blue', in_progress: 'badge-yellow', completed: 'badge-green', cancelled: 'badge-gray' };
    return <span className={`badge ${map[s] || 'badge-gray'}`}>{s?.replace(/_/g, ' ')}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <h1>Move-In / Move-Out</h1>
        <div className="header-actions">
          <button className="btn btn-purple" onClick={runAI}>🤖 AI Move Analysis</button>
          <button className="btn btn-blue" onClick={() => { setFormData(emptyActivity); setEditItem(null); setShowForm(true); }}>+ New Activity</button>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Tenant</th><th>Unit</th><th>Type</th><th>Scheduled</th><th>Status</th><th>Elevator</th><th>Staff</th></tr></thead>
          <tbody>
            {items.map(a => (
              <tr key={a.id} onClick={() => setSelected(a)}>
                <td style={{ fontWeight: 600 }}>{a.tenant_name}</td>
                <td>{a.unit_number}</td>
                <td>{typeBadge(a.activity_type)}</td>
                <td>{a.scheduled_date ? new Date(a.scheduled_date).toLocaleDateString() : '—'}</td>
                <td>{statusBadge(a.status)}</td>
                <td>{a.requires_elevator ? '✅' : '❌'}</td>
                <td>{a.staff_assigned || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AIOutput data={aiData} loading={aiLoading} title="AI Move-In/Out Analysis" />

      {selected && (
        <Modal title="Move Activity Details" onClose={() => setSelected(null)}>
          <div className="detail-grid">
            <div className="detail-item"><label>Tenant</label><div className="value">{selected.tenant_name}</div></div>
            <div className="detail-item"><label>Unit</label><div className="value">{selected.unit_number}</div></div>
            <div className="detail-item"><label>Type</label><div className="value">{typeBadge(selected.activity_type)}</div></div>
            <div className="detail-item"><label>Status</label><div className="value">{statusBadge(selected.status)}</div></div>
            <div className="detail-item"><label>Scheduled</label><div className="value">{selected.scheduled_date ? new Date(selected.scheduled_date).toLocaleDateString() : 'TBD'}</div></div>
            <div className="detail-item"><label>Completed</label><div className="value">{selected.completed_date ? new Date(selected.completed_date).toLocaleDateString() : 'Pending'}</div></div>
            <div className="detail-item"><label>Elevator</label><div className="value">{selected.requires_elevator ? 'Yes' : 'No'}</div></div>
            <div className="detail-item"><label>Staff</label><div className="value">{selected.staff_assigned || 'Unassigned'}</div></div>
          </div>
          {selected.special_instructions && <div className="detail-item" style={{ marginBottom: 16 }}><label>Special Instructions</label><div className="value">{selected.special_instructions}</div></div>}
          <div className="detail-actions">
            <button className="btn btn-blue btn-sm" onClick={() => handleEdit(selected)}>Edit</button>
            <button className="btn btn-red btn-sm" onClick={() => handleDelete(selected.id)}>Delete</button>
          </div>
        </Modal>
      )}

      {showForm && (
        <Modal title={editItem ? 'Edit Activity' : 'New Activity'} onClose={() => { setShowForm(false); setEditItem(null); }}>
          <div className="form-row">
            <div className="form-group"><label>Tenant Name</label><input value={formData.tenant_name} onChange={e => setFormData({...formData, tenant_name: e.target.value})} /></div>
            <div className="form-group"><label>Unit Number</label><input value={formData.unit_number || ''} onChange={e => setFormData({...formData, unit_number: e.target.value})} /></div>
            <div className="form-group"><label>Activity Type</label>
              <select value={formData.activity_type} onChange={e => setFormData({...formData, activity_type: e.target.value})}>
                <option value="move_in">Move In</option><option value="move_out">Move Out</option>
              </select>
            </div>
            <div className="form-group"><label>Status</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option value="scheduled">Scheduled</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="form-group"><label>Scheduled Date</label><input type="date" value={formData.scheduled_date || ''} onChange={e => setFormData({...formData, scheduled_date: e.target.value})} /></div>
            <div className="form-group"><label>Completed Date</label><input type="date" value={formData.completed_date || ''} onChange={e => setFormData({...formData, completed_date: e.target.value})} /></div>
            <div className="form-group"><label>Staff Assigned</label><input value={formData.staff_assigned || ''} onChange={e => setFormData({...formData, staff_assigned: e.target.value})} /></div>
            <div className="form-group full-width"><label>Special Instructions</label><textarea value={formData.special_instructions || ''} onChange={e => setFormData({...formData, special_instructions: e.target.value})} /></div>
          </div>
          <div className="checkbox-group"><input type="checkbox" checked={formData.requires_elevator} onChange={e => setFormData({...formData, requires_elevator: e.target.checked})} /><label>Requires Elevator</label></div>
          <div className="detail-actions" style={{ marginTop: 20 }}>
            <button className="btn btn-blue" onClick={handleSave}>{editItem ? 'Update' : 'Create'}</button>
            <button className="btn btn-outline" onClick={() => { setShowForm(false); setEditItem(null); }}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default MoveIOPage;
