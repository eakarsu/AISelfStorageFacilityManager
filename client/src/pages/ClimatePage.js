import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from '../components/Modal';
import AIOutput from '../components/AIOutput';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const emptyZone = { zone_name: '', current_temp: '', target_temp: '', current_humidity: '', target_humidity: '', hvac_status: 'auto', energy_usage_kwh: '', last_maintenance: '' };

function ClimatePage({ token }) {
  const [zones, setZones] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState(emptyZone);
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const load = async () => {
    const res = await axios.get(`${API}/climate`);
    setZones(res.data);
  };

  useEffect(() => { load(); }, []);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await axios.post(`${API}/ai/climate-optimization`);
      setAiData(res.data);
    } catch (err) {
      setAiData({ choices: [{ message: { content: 'Error: ' + (err.response?.data?.error || err.message) } }] });
    }
    setAiLoading(false);
  };

  const handleSave = async () => {
    if (editItem) {
      await axios.put(`${API}/climate/${editItem.id}`, formData);
    } else {
      await axios.post(`${API}/climate`, formData);
    }
    setShowForm(false); setEditItem(null); setFormData(emptyZone); load();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this zone?')) {
      await axios.delete(`${API}/climate/${id}`);
      setSelected(null); load();
    }
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setFormData({ ...item, last_maintenance: item.last_maintenance?.split('T')[0] });
    setShowForm(true); setSelected(null);
  };

  const hvacBadge = (s) => {
    const map = { auto: 'badge-green', cooling: 'badge-blue', heating: 'badge-yellow', off: 'badge-red' };
    return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>;
  };

  const tempStatus = (current, target) => {
    const diff = Math.abs(parseFloat(current) - parseFloat(target));
    if (diff <= 1) return 'badge-green';
    if (diff <= 3) return 'badge-yellow';
    return 'badge-red';
  };

  return (
    <div>
      <div className="page-header">
        <h1>Climate Control</h1>
        <div className="header-actions">
          <button className="btn btn-purple" onClick={runAI}>🤖 AI Climate Optimization</button>
          <button className="btn btn-blue" onClick={() => { setFormData(emptyZone); setEditItem(null); setShowForm(true); }}>+ New Zone</button>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr><th>Zone</th><th>Temp (°F)</th><th>Target</th><th>Humidity</th><th>HVAC</th><th>Energy (kWh)</th><th>Last Service</th></tr>
          </thead>
          <tbody>
            {zones.map(z => (
              <tr key={z.id} onClick={() => setSelected(z)}>
                <td style={{ fontWeight: 600 }}>{z.zone_name}</td>
                <td><span className={`badge ${tempStatus(z.current_temp, z.target_temp)}`}>{parseFloat(z.current_temp).toFixed(1)}°</span></td>
                <td>{parseFloat(z.target_temp).toFixed(1)}°</td>
                <td>{z.current_humidity ? `${parseFloat(z.current_humidity).toFixed(0)}%` : '—'}</td>
                <td>{hvacBadge(z.hvac_status)}</td>
                <td>{parseFloat(z.energy_usage_kwh).toFixed(1)}</td>
                <td>{z.last_maintenance ? new Date(z.last_maintenance).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AIOutput data={aiData} loading={aiLoading} title="AI Climate Optimization" />

      {selected && (
        <Modal title={selected.zone_name} onClose={() => setSelected(null)}>
          <div className="detail-grid">
            <div className="detail-item"><label>Zone Name</label><div className="value">{selected.zone_name}</div></div>
            <div className="detail-item"><label>HVAC Status</label><div className="value">{hvacBadge(selected.hvac_status)}</div></div>
            <div className="detail-item"><label>Current Temp</label><div className="value">{parseFloat(selected.current_temp).toFixed(1)}°F</div></div>
            <div className="detail-item"><label>Target Temp</label><div className="value">{parseFloat(selected.target_temp).toFixed(1)}°F</div></div>
            <div className="detail-item"><label>Current Humidity</label><div className="value">{selected.current_humidity ? `${parseFloat(selected.current_humidity).toFixed(1)}%` : 'N/A'}</div></div>
            <div className="detail-item"><label>Target Humidity</label><div className="value">{selected.target_humidity ? `${parseFloat(selected.target_humidity).toFixed(1)}%` : 'N/A'}</div></div>
            <div className="detail-item"><label>Energy Usage</label><div className="value">{parseFloat(selected.energy_usage_kwh).toFixed(1)} kWh</div></div>
            <div className="detail-item"><label>Last Maintenance</label><div className="value">{selected.last_maintenance ? new Date(selected.last_maintenance).toLocaleDateString() : 'N/A'}</div></div>
          </div>
          <div className="detail-actions">
            <button className="btn btn-blue btn-sm" onClick={() => handleEdit(selected)}>Edit</button>
            <button className="btn btn-red btn-sm" onClick={() => handleDelete(selected.id)}>Delete</button>
          </div>
        </Modal>
      )}

      {showForm && (
        <Modal title={editItem ? 'Edit Climate Zone' : 'New Climate Zone'} onClose={() => { setShowForm(false); setEditItem(null); }}>
          <div className="form-row">
            <div className="form-group full-width">
              <label>Zone Name</label>
              <input value={formData.zone_name} onChange={e => setFormData({...formData, zone_name: e.target.value})} placeholder="e.g. Building A - Floor 1" />
            </div>
            <div className="form-group">
              <label>Current Temp (°F)</label>
              <input type="number" step="0.1" value={formData.current_temp} onChange={e => setFormData({...formData, current_temp: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Target Temp (°F)</label>
              <input type="number" step="0.1" value={formData.target_temp} onChange={e => setFormData({...formData, target_temp: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Current Humidity (%)</label>
              <input type="number" step="0.1" value={formData.current_humidity || ''} onChange={e => setFormData({...formData, current_humidity: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Target Humidity (%)</label>
              <input type="number" step="0.1" value={formData.target_humidity || ''} onChange={e => setFormData({...formData, target_humidity: e.target.value})} />
            </div>
            <div className="form-group">
              <label>HVAC Status</label>
              <select value={formData.hvac_status} onChange={e => setFormData({...formData, hvac_status: e.target.value})}>
                <option value="auto">Auto</option><option value="cooling">Cooling</option><option value="heating">Heating</option><option value="off">Off</option>
              </select>
            </div>
            <div className="form-group">
              <label>Energy Usage (kWh)</label>
              <input type="number" step="0.1" value={formData.energy_usage_kwh} onChange={e => setFormData({...formData, energy_usage_kwh: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Last Maintenance</label>
              <input type="date" value={formData.last_maintenance || ''} onChange={e => setFormData({...formData, last_maintenance: e.target.value})} />
            </div>
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

export default ClimatePage;
