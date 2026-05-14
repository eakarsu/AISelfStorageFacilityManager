import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from '../components/Modal';
import AIOutput from '../components/AIOutput';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const emptyUnit = { unit_number: '', size_sqft: '', unit_type: 'small', climate_controlled: false, floor_level: 1, monthly_rate: '', status: 'available' };

function UnitsPage({ token }) {
  const [units, setUnits] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState(emptyUnit);
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const load = async () => {
    const res = await axios.get(`${API}/units`);
    setUnits(res.data.data || res.data);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (editItem) {
      await axios.put(`${API}/units/${editItem.id}`, formData);
    } else {
      await axios.post(`${API}/units`, formData);
    }
    setShowForm(false);
    setEditItem(null);
    setFormData(emptyUnit);
    load();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this unit?')) {
      await axios.delete(`${API}/units/${id}`);
      setSelected(null);
      load();
    }
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setFormData(item);
    setShowForm(true);
    setSelected(null);
  };

  const statusBadge = (s) => {
    const map = { available: 'badge-green', occupied: 'badge-blue', reserved: 'badge-yellow', maintenance: 'badge-red' };
    return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <h1>Storage Units</h1>
        <div className="header-actions">
          <button className="btn btn-blue" onClick={() => { setFormData(emptyUnit); setEditItem(null); setShowForm(true); }}>+ New Unit</button>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Unit #</th>
              <th>Size (sqft)</th>
              <th>Type</th>
              <th>Climate</th>
              <th>Floor</th>
              <th>Rate</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {units.map(u => (
              <tr key={u.id} onClick={() => setSelected(u)}>
                <td style={{ fontWeight: 600 }}>{u.unit_number}</td>
                <td>{u.size_sqft}</td>
                <td>{u.unit_type}</td>
                <td>{u.climate_controlled ? '✅' : '❌'}</td>
                <td>{u.floor_level}</td>
                <td>${parseFloat(u.monthly_rate).toFixed(2)}</td>
                <td>{statusBadge(u.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <Modal title={`Unit ${selected.unit_number}`} onClose={() => setSelected(null)}>
          <div className="detail-grid">
            <div className="detail-item"><label>Unit Number</label><div className="value">{selected.unit_number}</div></div>
            <div className="detail-item"><label>Size</label><div className="value">{selected.size_sqft} sqft</div></div>
            <div className="detail-item"><label>Type</label><div className="value">{selected.unit_type}</div></div>
            <div className="detail-item"><label>Climate Controlled</label><div className="value">{selected.climate_controlled ? 'Yes' : 'No'}</div></div>
            <div className="detail-item"><label>Floor Level</label><div className="value">{selected.floor_level}</div></div>
            <div className="detail-item"><label>Monthly Rate</label><div className="value">${parseFloat(selected.monthly_rate).toFixed(2)}</div></div>
            <div className="detail-item"><label>Status</label><div className="value">{statusBadge(selected.status)}</div></div>
            <div className="detail-item"><label>Last Updated</label><div className="value">{new Date(selected.updated_at).toLocaleDateString()}</div></div>
          </div>
          <div className="detail-actions">
            <button className="btn btn-blue btn-sm" onClick={() => handleEdit(selected)}>Edit</button>
            <button className="btn btn-red btn-sm" onClick={() => handleDelete(selected.id)}>Delete</button>
          </div>
        </Modal>
      )}

      {showForm && (
        <Modal title={editItem ? 'Edit Unit' : 'New Unit'} onClose={() => { setShowForm(false); setEditItem(null); }}>
          <div className="form-row">
            <div className="form-group">
              <label>Unit Number</label>
              <input value={formData.unit_number} onChange={e => setFormData({...formData, unit_number: e.target.value})} placeholder="e.g. A-101" />
            </div>
            <div className="form-group">
              <label>Size (sqft)</label>
              <input type="number" value={formData.size_sqft} onChange={e => setFormData({...formData, size_sqft: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select value={formData.unit_type} onChange={e => setFormData({...formData, unit_type: e.target.value})}>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="extra-large">Extra Large</option>
                <option value="vehicle">Vehicle</option>
              </select>
            </div>
            <div className="form-group">
              <label>Floor Level</label>
              <input type="number" value={formData.floor_level} onChange={e => setFormData({...formData, floor_level: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Monthly Rate ($)</label>
              <input type="number" step="0.01" value={formData.monthly_rate} onChange={e => setFormData({...formData, monthly_rate: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="reserved">Reserved</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>
          <div className="checkbox-group">
            <input type="checkbox" checked={formData.climate_controlled} onChange={e => setFormData({...formData, climate_controlled: e.target.checked})} />
            <label>Climate Controlled</label>
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

export default UnitsPage;
