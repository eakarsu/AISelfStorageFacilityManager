import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/units', label: 'Storage Units', icon: '🏢' },
  { path: '/tenants', label: 'Tenants', icon: '👥' },
  { path: '/pricing', label: 'Dynamic Pricing', icon: '💰' },
  { path: '/occupancy', label: 'Occupancy Forecast', icon: '📈' },
  { path: '/climate', label: 'Climate Control', icon: '🌡️' },
  { path: '/security', label: 'Security Monitor', icon: '🔒' },
  { path: '/access', label: 'Access Logs', icon: '🚪' },
  { path: '/billing', label: 'Billing & Payments', icon: '💳' },
  { path: '/insurance', label: 'Insurance', icon: '🛡️' },
  { path: '/maintenance', label: 'Maintenance', icon: '🔧' },
  { path: '/moveio', label: 'Move In/Out', icon: '📦' },
  { path: '/revenue', label: 'Revenue', icon: '💵' },
  { path: '/reports', label: 'Reports', icon: '📑' },
  { path: '/promotions', label: 'Promotions', icon: '🎁' },
  { path: '/waitlist', label: 'Waitlist', icon: '📝' },
  { path: '/notifications', label: 'Notifications', icon: '🔔' },
];

function Layout({ user, onLogout, children }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">AI Storage Manager</div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.path}
              className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div style={{ padding: '8px 12px', fontSize: '13px', color: '#64748b' }}>
            {user?.name}
          </div>
          <button className="sidebar-link" onClick={onLogout}>
            <span className="icon">🚪</span>
            Logout
          </button>
        </div>
      </aside>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

export default Layout;
