import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const features = [
  {
    path: '/units',
    icon: '🏢',
    title: 'Storage Units',
    desc: 'Manage all storage units, track availability, sizes, and configurations across your facility.',
    endpoint: '/units',
  },
  {
    path: '/tenants',
    icon: '👥',
    title: 'Tenant Management',
    desc: 'Track tenant information, lease agreements, contact details, and ID verification status.',
    endpoint: '/tenants',
  },
  {
    path: '/pricing',
    icon: '💰',
    title: 'Dynamic Pricing',
    desc: 'Pricing rules that adjust rates based on demand, seasonality, and market conditions.',
    endpoint: '/pricing',
  },
  {
    path: '/billing',
    icon: '💳',
    title: 'Billing & Payments',
    desc: 'Manage tenant billing, payment tracking, auto-pay setups, and overdue alerts.',
    endpoint: '/billing',
  },
  {
    path: '/occupancy',
    icon: '📈',
    title: 'Occupancy Forecasting',
    desc: 'Predict future occupancy rates using historical data and market trends.',
    endpoint: '/occupancy',
  },
  {
    path: '/climate',
    icon: '🌡️',
    title: 'Climate Control',
    desc: 'Monitor and optimize temperature, humidity, and HVAC systems across all facility zones.',
    endpoint: '/climate',
  },
  {
    path: '/security',
    icon: '🔒',
    title: 'Security Monitoring',
    desc: 'Track security events, camera feeds, access logs, and manage incident responses.',
    endpoint: '/security',
  },
  {
    path: '/access',
    icon: '🚪',
    title: 'Access Logs',
    desc: 'Monitor gate and unit access events, track entry methods, and flag denied attempts.',
    endpoint: '/access',
  },
  {
    path: '/maintenance',
    icon: '🔧',
    title: 'Maintenance Requests',
    desc: 'Manage facility maintenance, track work orders, assign staff, and monitor repair costs.',
    endpoint: '/maintenance',
  },
  {
    path: '/insurance',
    icon: '🛡️',
    title: 'Insurance Tracking',
    desc: 'Track tenant insurance policies, coverage amounts, expiration dates, and provider details.',
    endpoint: '/insurance',
  },
  {
    path: '/moveio',
    icon: '📦',
    title: 'Move-In / Move-Out',
    desc: 'Schedule and manage tenant move activities, elevator needs, and staff assignments.',
    endpoint: '/moveio',
  },
  {
    path: '/revenue',
    icon: '💵',
    title: 'Revenue Analytics',
    desc: 'Track all revenue streams including rent, insurance, fees, and merchandise sales.',
    endpoint: '/revenue',
  },
  {
    path: '/reports',
    icon: '📑',
    title: 'Reports & Analytics',
    desc: 'View aggregated reports on occupancy, revenue, payments, maintenance, and lease status.',
    endpoint: '/reports/occupancy-by-type',
  },
  {
    path: '/promotions',
    icon: '🎁',
    title: 'Promotions & Discounts',
    desc: 'Create and manage promotional offers, discount codes, and special deals for tenants.',
    endpoint: '/promotions',
  },
  {
    path: '/waitlist',
    icon: '📝',
    title: 'Waitlist',
    desc: 'Track prospective tenants waiting for units, manage contacts and follow-up status.',
    endpoint: '/waitlist',
  },
  {
    path: '/notifications',
    icon: '🔔',
    title: 'Notifications & Alerts',
    desc: 'Auto-detect overdue payments, expiring leases, security issues, and maintenance alerts.',
    endpoint: '/notifications',
  },
];

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [featureResults, occRes, payRes] = await Promise.all([
          Promise.all(features.map(f => axios.get(`${API}${f.endpoint}`).catch(() => ({ data: [] })))),
          axios.get(`${API}/reports/occupancy-summary`).catch(() => ({ data: null })),
          axios.get(`${API}/reports/payment-status`).catch(() => ({ data: [] })),
        ]);
        const s = {};
        features.forEach((f, i) => {
          const d = featureResults[i].data;
          // Handle both paginated {data: [...], pagination: {...}} and plain array responses
          const arr = Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : null);
          s[f.path] = arr ? arr.length : (d?.pagination?.total ?? '—');
        });
        setStats(s);
        const payList = Array.isArray(payRes.data) ? payRes.data : (payRes.data?.data || []);
        const overdue = payList.filter(p => p.status === 'overdue').reduce((sum, p) => sum + parseFloat(p.total_amount || 0), 0);
        setSummary({
          occupancy: occRes.data,
          overdueAmount: overdue,
        });
      } catch (err) {
        console.error(err);
      }
    };
    loadStats();
  }, []);

  return (
    <div>
      <div className="dashboard-header">
        <h1>Facility Dashboard</h1>
        <p>Self-storage facility management overview</p>
      </div>

      {summary && summary.occupancy && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
          <div className="stat-card">
            <div className="stat-card-label">Total Units</div>
            <div className="stat-card-value">{summary.occupancy.total_units}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Occupancy Rate</div>
            <div className="stat-card-value" style={{ color: '#10b981' }}>{summary.occupancy.occupancy_rate}%</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Occupied</div>
            <div className="stat-card-value" style={{ color: '#60a5fa' }}>{summary.occupancy.occupied}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Available</div>
            <div className="stat-card-value" style={{ color: '#fbbf24' }}>{summary.occupancy.available}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Reserved</div>
            <div className="stat-card-value" style={{ color: '#c084fc' }}>{summary.occupancy.reserved}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Overdue Payments</div>
            <div className="stat-card-value" style={{ color: summary.overdueAmount > 0 ? '#f87171' : '#10b981' }}>
              ${summary.overdueAmount.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      <div className="cards-grid">
        {features.map(feature => (
          <div
            key={feature.path}
            className="feature-card"
            onClick={() => navigate(feature.path)}
          >
            <div className="card-icon">{feature.icon}</div>
            <h3>{feature.title}</h3>
            <p>{feature.desc}</p>
            <div className="card-stats">
              <div className="stat">
                <div className="stat-value">{stats[feature.path] ?? '—'}</div>
                <div className="stat-label">Total Records</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
