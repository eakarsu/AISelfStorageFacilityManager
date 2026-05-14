import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

function NotificationsPage({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  const load = async () => { const res = await axios.get(`${API}/notifications`); setItems(res.data.data || res.data); };
  useEffect(() => { load(); }, []);

  const generateAlerts = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/notifications/generate`);
      setItems(res.data.data || res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const markRead = async (id) => {
    await axios.put(`${API}/notifications/${id}/read`);
    load();
  };

  const markAllRead = async () => {
    await axios.put(`${API}/notifications/mark-all-read`);
    load();
  };

  const deleteNotification = async (id) => {
    await axios.delete(`${API}/notifications/${id}`);
    load();
  };

  const getSeverityBadge = (severity) => {
    const map = { critical: 'badge-red', high: 'badge-yellow', medium: 'badge-blue', low: 'badge-gray' };
    return map[severity] || 'badge-gray';
  };

  const getTypeIcon = (type) => {
    const map = {
      overdue_payment: '💳', lease_expiring: '📋', lease_expired: '🚨',
      security_alert: '🔒', maintenance_urgent: '🔧', insurance_expired: '🛡️', id_unverified: '🪪'
    };
    return map[type] || '🔔';
  };

  const unreadCount = items.filter(i => !i.is_read).length;
  const filtered = filter === 'all' ? items :
    filter === 'unread' ? items.filter(i => !i.is_read) :
    items.filter(i => i.severity === filter);

  return (
    <div>
      <div className="page-header">
        <h1>Notifications & Alerts {unreadCount > 0 && <span className="badge badge-red" style={{ fontSize: 14, marginLeft: 8 }}>{unreadCount} new</span>}</h1>
        <div className="header-actions">
          <button className="btn btn-green" onClick={generateAlerts} disabled={loading}>
            {loading ? 'Scanning...' : 'Scan for Issues'}
          </button>
          {unreadCount > 0 && <button className="btn btn-outline" onClick={markAllRead}>Mark All Read</button>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div className="stat-card" style={{ padding: '12px 16px' }}>
          <div className="stat-card-label">Total Alerts</div>
          <div className="stat-card-value" style={{ fontSize: 24 }}>{items.length}</div>
        </div>
        <div className="stat-card" style={{ padding: '12px 16px' }}>
          <div className="stat-card-label">Critical</div>
          <div className="stat-card-value" style={{ fontSize: 24, color: '#f87171' }}>{items.filter(i => i.severity === 'critical').length}</div>
        </div>
        <div className="stat-card" style={{ padding: '12px 16px' }}>
          <div className="stat-card-label">High</div>
          <div className="stat-card-value" style={{ fontSize: 24, color: '#fbbf24' }}>{items.filter(i => i.severity === 'high').length}</div>
        </div>
        <div className="stat-card" style={{ padding: '12px 16px' }}>
          <div className="stat-card-label">Medium</div>
          <div className="stat-card-value" style={{ fontSize: 24, color: '#60a5fa' }}>{items.filter(i => i.severity === 'medium').length}</div>
        </div>
        <div className="stat-card" style={{ padding: '12px 16px' }}>
          <div className="stat-card-label">Low</div>
          <div className="stat-card-value" style={{ fontSize: 24, color: '#94a3b8' }}>{items.filter(i => i.severity === 'low').length}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['all', 'unread', 'critical', 'high', 'medium', 'low'].map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-blue' : 'btn-outline'}`} onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>
            {f}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
            {items.length === 0 ? 'No notifications yet. Click "Scan for Issues" to auto-detect alerts.' : 'No matching notifications.'}
          </div>
        )}
        {filtered.map(n => (
          <div
            key={n.id}
            style={{
              background: n.is_read ? '#1e293b' : '#1e293b',
              border: `1px solid ${n.is_read ? '#334155' : n.severity === 'critical' ? '#7f1d1d' : n.severity === 'high' ? '#713f12' : '#334155'}`,
              borderRadius: 10,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 14,
              opacity: n.is_read ? 0.7 : 1,
            }}
          >
            <div style={{ fontSize: 24, flexShrink: 0 }}>{getTypeIcon(n.type)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{n.title}</span>
                <span className={`badge ${getSeverityBadge(n.severity)}`}>{n.severity}</span>
                {!n.is_read && <span className="badge badge-blue" style={{ fontSize: 9 }}>NEW</span>}
              </div>
              <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>{n.message}</div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>
                {n.related_entity && <span style={{ textTransform: 'capitalize' }}>{n.related_entity}</span>}
                {n.related_id && <span> - {n.related_id}</span>}
                <span style={{ marginLeft: 12 }}>{new Date(n.created_at).toLocaleString()}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {!n.is_read && <button className="btn btn-sm btn-outline" onClick={() => markRead(n.id)} title="Mark as read">Read</button>}
              <button className="btn btn-sm btn-outline" onClick={() => deleteNotification(n.id)} title="Dismiss" style={{ color: '#f87171' }}>Dismiss</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default NotificationsPage;
