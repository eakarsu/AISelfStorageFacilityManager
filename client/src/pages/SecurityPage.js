import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from '../components/Modal';
import AIOutput from '../components/AIOutput';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const emptyEvent = { event_type: 'motion_detected', location: '', severity: 'low', description: '', camera_id: '', resolved: false, resolved_by: '' };

function SecurityPage({ token }) {
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState(emptyEvent);
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const load = async () => {
    const res = await axios.get(`${API}/security`);
    setEvents(res.data);
  };

  useEffect(() => { load(); }, []);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await axios.post(`${API}/ai/security-analysis`);
      setAiData(res.data);
    } catch (err) {
      setAiData({ choices: [{ message: { content: 'Error: ' + (err.response?.data?.error || err.message) } }] });
    }
    setAiLoading(false);
  };

  const handleSave = async () => {
    if (editItem) {
      await axios.put(`${API}/security/${editItem.id}`, formData);
    } else {
      await axios.post(`${API}/security`, formData);
    }
    setShowForm(false); setEditItem(null); setFormData(emptyEvent); load();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this event?')) {
      await axios.delete(`${API}/security/${id}`);
      setSelected(null); load();
    }
  };

  const handleEdit = (item) => {
    setEditItem(item); setFormData(item); setShowForm(true); setSelected(null);
  };

  const severityBadge = (s) => {
    const map = { low: 'badge-green', medium: 'badge-yellow', high: 'badge-red', critical: 'badge-purple' };
    return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <h1>Security Monitoring</h1>
        <div className="header-actions">
          <button className="btn btn-purple" onClick={runAI}>🤖 AI Security Analysis</button>
          <button className="btn btn-blue" onClick={() => { setFormData(emptyEvent); setEditItem(null); setShowForm(true); }}>+ New Event</button>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr><th>Time</th><th>Type</th><th>Location</th><th>Severity</th><th>Camera</th><th>Resolved</th></tr>
          </thead>
          <tbody>
            {events.map(e => (
              <tr key={e.id} onClick={() => setSelected(e)}>
                <td style={{ fontWeight: 600 }}>{new Date(e.event_time).toLocaleString()}</td>
                <td>{e.event_type.replace(/_/g, ' ')}</td>
                <td>{e.location}</td>
                <td>{severityBadge(e.severity)}</td>
                <td>{e.camera_id}</td>
                <td>{e.resolved ? <span className="badge badge-green">Resolved</span> : <span className="badge badge-red">Open</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AIOutput data={aiData} loading={aiLoading} title="AI Security Analysis" />

      {selected && (
        <Modal title="Security Event Details" onClose={() => setSelected(null)}>
          <div className="detail-grid">
            <div className="detail-item"><label>Event Type</label><div className="value">{selected.event_type.replace(/_/g, ' ')}</div></div>
            <div className="detail-item"><label>Severity</label><div className="value">{severityBadge(selected.severity)}</div></div>
            <div className="detail-item"><label>Location</label><div className="value">{selected.location}</div></div>
            <div className="detail-item"><label>Camera ID</label><div className="value">{selected.camera_id}</div></div>
            <div className="detail-item"><label>Time</label><div className="value">{new Date(selected.event_time).toLocaleString()}</div></div>
            <div className="detail-item"><label>Resolved</label><div className="value">{selected.resolved ? 'Yes' : 'No'}</div></div>
            {selected.resolved_by && <div className="detail-item"><label>Resolved By</label><div className="value">{selected.resolved_by}</div></div>}
          </div>
          {selected.description && <div className="detail-item" style={{ marginBottom: 16 }}><label>Description</label><div className="value">{selected.description}</div></div>}
          <div className="detail-actions">
            <button className="btn btn-blue btn-sm" onClick={() => handleEdit(selected)}>Edit</button>
            <button className="btn btn-red btn-sm" onClick={() => handleDelete(selected.id)}>Delete</button>
          </div>
        </Modal>
      )}

      {showForm && (
        <Modal title={editItem ? 'Edit Security Event' : 'New Security Event'} onClose={() => { setShowForm(false); setEditItem(null); }}>
          <div className="form-row">
            <div className="form-group">
              <label>Event Type</label>
              <select value={formData.event_type} onChange={e => setFormData({...formData, event_type: e.target.value})}>
                <option value="motion_detected">Motion Detected</option>
                <option value="unauthorized_access">Unauthorized Access</option>
                <option value="door_forced">Door Forced</option>
                <option value="camera_offline">Camera Offline</option>
                <option value="fire_alarm">Fire Alarm</option>
                <option value="loitering">Loitering</option>
                <option value="gate_malfunction">Gate Malfunction</option>
                <option value="power_outage">Power Outage</option>
                <option value="vandalism">Vandalism</option>
                <option value="water_leak">Water Leak</option>
                <option value="tailgating">Tailgating</option>
                <option value="alarm_triggered">Alarm Triggered</option>
                <option value="suspicious_vehicle">Suspicious Vehicle</option>
                <option value="perimeter_breach">Perimeter Breach</option>
                <option value="equipment_failure">Equipment Failure</option>
              </select>
            </div>
            <div className="form-group">
              <label>Severity</label>
              <select value={formData.severity} onChange={e => setFormData({...formData, severity: e.target.value})}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
              </select>
            </div>
            <div className="form-group">
              <label>Location</label>
              <input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="e.g. Building A - Floor 1" />
            </div>
            <div className="form-group">
              <label>Camera ID</label>
              <input value={formData.camera_id} onChange={e => setFormData({...formData, camera_id: e.target.value})} placeholder="e.g. CAM-01" />
            </div>
            <div className="form-group full-width">
              <label>Description</label>
              <textarea value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Describe the event..." />
            </div>
            <div className="form-group">
              <label>Resolved By</label>
              <input value={formData.resolved_by || ''} onChange={e => setFormData({...formData, resolved_by: e.target.value})} placeholder="Name or team" />
            </div>
          </div>
          <div className="checkbox-group">
            <input type="checkbox" checked={formData.resolved} onChange={e => setFormData({...formData, resolved: e.target.checked})} />
            <label>Resolved</label>
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

export default SecurityPage;
