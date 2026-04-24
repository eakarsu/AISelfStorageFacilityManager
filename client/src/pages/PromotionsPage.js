import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from '../components/Modal';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const emptyPromo = { name: '', description: '', discount_type: 'percentage', discount_value: '', unit_type: 'all', start_date: '', end_date: '', promo_code: '', max_uses: 0, is_active: true };

function PromotionsPage({ token }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState(emptyPromo);

  const load = async () => { const res = await axios.get(`${API}/promotions`); setItems(res.data); };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (editItem) await axios.put(`${API}/promotions/${editItem.id}`, formData);
    else await axios.post(`${API}/promotions`, formData);
    setShowForm(false); setEditItem(null); setFormData(emptyPromo); load();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this promotion?')) { await axios.delete(`${API}/promotions/${id}`); setSelected(null); load(); }
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setFormData({ ...item, start_date: item.start_date?.split('T')[0], end_date: item.end_date?.split('T')[0] });
    setShowForm(true); setSelected(null);
  };

  const getDiscountDisplay = (item) => {
    if (item.discount_type === 'percentage') return `${item.discount_value}%`;
    if (item.discount_type === 'fixed') return `$${parseFloat(item.discount_value).toFixed(2)}`;
    if (item.discount_type === 'free_month') return `${item.discount_value} mo free`;
    return item.discount_value;
  };

  return (
    <div>
      <div className="page-header">
        <h1>Promotions & Discounts</h1>
        <div className="header-actions">
          <button className="btn btn-blue" onClick={() => { setFormData(emptyPromo); setEditItem(null); setShowForm(true); }}>+ New Promotion</button>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Code</th><th>Discount</th><th>Unit Type</th><th>Valid Period</th><th>Uses</th><th>Status</th></tr></thead>
          <tbody>
            {items.map(p => (
              <tr key={p.id} onClick={() => setSelected(p)}>
                <td style={{ fontWeight: 600 }}>{p.name}</td>
                <td><code style={{ background: '#0f172a', padding: '2px 8px', borderRadius: 4, color: '#fbbf24' }}>{p.promo_code}</code></td>
                <td style={{ fontWeight: 600, color: '#10b981' }}>{getDiscountDisplay(p)}</td>
                <td style={{ textTransform: 'capitalize' }}>{p.unit_type}</td>
                <td>{p.start_date ? new Date(p.start_date).toLocaleDateString() : '—'} - {p.end_date ? new Date(p.end_date).toLocaleDateString() : '—'}</td>
                <td>{p.current_uses}/{p.max_uses || 'unlimited'}</td>
                <td>{p.is_active ? <span className="badge badge-green">Active</span> : <span className="badge badge-gray">Inactive</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)}>
          <div className="detail-grid">
            <div className="detail-item"><label>Name</label><div className="value">{selected.name}</div></div>
            <div className="detail-item"><label>Promo Code</label><div className="value">{selected.promo_code}</div></div>
            <div className="detail-item"><label>Discount Type</label><div className="value" style={{ textTransform: 'capitalize' }}>{selected.discount_type.replace(/_/g, ' ')}</div></div>
            <div className="detail-item"><label>Discount Value</label><div className="value">{getDiscountDisplay(selected)}</div></div>
            <div className="detail-item"><label>Unit Type</label><div className="value" style={{ textTransform: 'capitalize' }}>{selected.unit_type}</div></div>
            <div className="detail-item"><label>Status</label><div className="value">{selected.is_active ? 'Active' : 'Inactive'}</div></div>
            <div className="detail-item"><label>Start Date</label><div className="value">{selected.start_date ? new Date(selected.start_date).toLocaleDateString() : 'N/A'}</div></div>
            <div className="detail-item"><label>End Date</label><div className="value">{selected.end_date ? new Date(selected.end_date).toLocaleDateString() : 'N/A'}</div></div>
            <div className="detail-item"><label>Max Uses</label><div className="value">{selected.max_uses || 'Unlimited'}</div></div>
            <div className="detail-item"><label>Current Uses</label><div className="value">{selected.current_uses}</div></div>
          </div>
          {selected.description && <div className="detail-item" style={{ marginBottom: 16 }}><label>Description</label><div className="value">{selected.description}</div></div>}
          <div className="detail-actions">
            <button className="btn btn-blue btn-sm" onClick={() => handleEdit(selected)}>Edit</button>
            <button className="btn btn-red btn-sm" onClick={() => handleDelete(selected.id)}>Delete</button>
          </div>
        </Modal>
      )}

      {showForm && (
        <Modal title={editItem ? 'Edit Promotion' : 'New Promotion'} onClose={() => { setShowForm(false); setEditItem(null); }}>
          <div className="form-row">
            <div className="form-group"><label>Name</label><input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
            <div className="form-group"><label>Promo Code</label><input value={formData.promo_code} onChange={e => setFormData({...formData, promo_code: e.target.value.toUpperCase()})} placeholder="e.g. SUMMER25" /></div>
            <div className="form-group">
              <label>Discount Type</label>
              <select value={formData.discount_type} onChange={e => setFormData({...formData, discount_type: e.target.value})}>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
                <option value="free_month">Free Month(s)</option>
              </select>
            </div>
            <div className="form-group"><label>Discount Value</label><input type="number" value={formData.discount_value} onChange={e => setFormData({...formData, discount_value: e.target.value})} /></div>
            <div className="form-group">
              <label>Unit Type</label>
              <select value={formData.unit_type} onChange={e => setFormData({...formData, unit_type: e.target.value})}>
                <option value="all">All Types</option>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="extra-large">Extra Large</option>
                <option value="vehicle">Vehicle</option>
              </select>
            </div>
            <div className="form-group"><label>Max Uses (0 = unlimited)</label><input type="number" value={formData.max_uses} onChange={e => setFormData({...formData, max_uses: parseInt(e.target.value) || 0})} /></div>
            <div className="form-group"><label>Start Date</label><input type="date" value={formData.start_date || ''} onChange={e => setFormData({...formData, start_date: e.target.value})} /></div>
            <div className="form-group"><label>End Date</label><input type="date" value={formData.end_date || ''} onChange={e => setFormData({...formData, end_date: e.target.value})} /></div>
            <div className="form-group full-width"><label>Description</label><textarea value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
          </div>
          <div className="checkbox-group"><input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} /><label>Active</label></div>
          <div className="detail-actions" style={{ marginTop: 20 }}>
            <button className="btn btn-blue" onClick={handleSave}>{editItem ? 'Update' : 'Create'}</button>
            <button className="btn btn-outline" onClick={() => { setShowForm(false); setEditItem(null); }}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default PromotionsPage;
