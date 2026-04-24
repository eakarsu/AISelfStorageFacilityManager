import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

function ReportsPage({ token }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [occupancySummary, setOccupancySummary] = useState(null);
  const [occupancyByType, setOccupancyByType] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState([]);
  const [revenueByCategory, setRevenueByCategory] = useState([]);
  const [revenueSummary, setRevenueSummary] = useState([]);
  const [maintenanceSummary, setMaintenanceSummary] = useState([]);
  const [leaseExpirations, setLeaseExpirations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        const [occ, occType, pay, revCat, revSum, maint, lease] = await Promise.all([
          axios.get(`${API}/reports/occupancy-summary`),
          axios.get(`${API}/reports/occupancy-by-type`),
          axios.get(`${API}/reports/payment-status`),
          axios.get(`${API}/reports/revenue-by-category`),
          axios.get(`${API}/reports/revenue-summary`),
          axios.get(`${API}/reports/maintenance-summary`),
          axios.get(`${API}/reports/lease-expirations`),
        ]);
        setOccupancySummary(occ.data);
        setOccupancyByType(occType.data);
        setPaymentStatus(pay.data);
        setRevenueByCategory(revCat.data);
        setRevenueSummary(revSum.data);
        setMaintenanceSummary(maint.data);
        setLeaseExpirations(lease.data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    loadAll();
  }, []);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'revenue', label: 'Revenue' },
    { id: 'occupancy', label: 'Occupancy' },
    { id: 'payments', label: 'Payments' },
    { id: 'maintenance', label: 'Maintenance' },
    { id: 'leases', label: 'Leases' },
  ];

  const getStatusBadge = (status) => {
    const map = { expired: 'badge-red', expiring_soon: 'badge-yellow', upcoming: 'badge-blue', active: 'badge-green' };
    return map[status] || 'badge-gray';
  };

  const monthName = (m) => ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m] || m;

  if (loading) return <div style={{ padding: 40, color: '#94a3b8' }}>Loading reports...</div>;

  const totalRevenue = revenueByCategory.reduce((s, r) => s + parseFloat(r.total_amount || 0), 0);
  const totalPaid = paymentStatus.filter(p => p.status === 'paid').reduce((s, p) => s + parseFloat(p.total_amount || 0), 0);
  const totalOverdue = paymentStatus.filter(p => p.status === 'overdue').reduce((s, p) => s + parseFloat(p.total_amount || 0), 0);

  return (
    <div>
      <div className="page-header">
        <h1>Reports & Analytics</h1>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`btn ${activeTab === tab.id ? 'btn-blue' : 'btn-outline'}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-card-label">Total Units</div>
              <div className="stat-card-value">{occupancySummary?.total_units || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Occupancy Rate</div>
              <div className="stat-card-value" style={{ color: '#10b981' }}>{occupancySummary?.occupancy_rate || 0}%</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Total Revenue</div>
              <div className="stat-card-value" style={{ color: '#60a5fa' }}>${totalRevenue.toFixed(2)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Overdue Payments</div>
              <div className="stat-card-value" style={{ color: '#f87171' }}>${totalOverdue.toFixed(2)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Occupied</div>
              <div className="stat-card-value">{occupancySummary?.occupied || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Available</div>
              <div className="stat-card-value" style={{ color: '#fbbf24' }}>{occupancySummary?.available || 0}</div>
            </div>
          </div>

          <h3 style={{ marginBottom: 12, fontSize: 16 }}>Occupancy by Unit Type</h3>
          <div className="data-table-container" style={{ marginBottom: 24 }}>
            <table className="data-table">
              <thead><tr><th>Type</th><th>Total</th><th>Occupied</th><th>Available</th><th>Reserved</th><th>Rate</th></tr></thead>
              <tbody>
                {occupancyByType.map(r => (
                  <tr key={r.unit_type}>
                    <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>{r.unit_type}</td>
                    <td>{r.total}</td>
                    <td>{r.occupied}</td>
                    <td>{r.available}</td>
                    <td>{r.reserved}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 8, background: '#334155', borderRadius: 4, maxWidth: 100 }}>
                          <div style={{ width: `${r.occupancy_rate}%`, height: '100%', background: '#10b981', borderRadius: 4 }} />
                        </div>
                        <span>{r.occupancy_rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'revenue' && (
        <div>
          <h3 style={{ marginBottom: 12, fontSize: 16 }}>Revenue by Category</h3>
          <div className="data-table-container" style={{ marginBottom: 24 }}>
            <table className="data-table">
              <thead><tr><th>Category</th><th>Transactions</th><th>Total</th><th>Average</th><th>Share</th></tr></thead>
              <tbody>
                {revenueByCategory.map(r => (
                  <tr key={r.category}>
                    <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>{r.category}</td>
                    <td>{r.transaction_count}</td>
                    <td>${parseFloat(r.total_amount).toFixed(2)}</td>
                    <td>${parseFloat(r.avg_amount).toFixed(2)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 8, background: '#334155', borderRadius: 4, maxWidth: 100 }}>
                          <div style={{ width: `${(parseFloat(r.total_amount) / totalRevenue * 100).toFixed(0)}%`, height: '100%', background: '#60a5fa', borderRadius: 4 }} />
                        </div>
                        <span>{(parseFloat(r.total_amount) / totalRevenue * 100).toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 style={{ marginBottom: 12, fontSize: 16 }}>Monthly Revenue Breakdown</h3>
          <div className="data-table-container">
            <table className="data-table">
              <thead><tr><th>Period</th><th>Category</th><th>Transactions</th><th>Total</th></tr></thead>
              <tbody>
                {revenueSummary.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{monthName(r.period_month)} {r.period_year}</td>
                    <td style={{ textTransform: 'capitalize' }}>{r.category}</td>
                    <td>{r.transaction_count}</td>
                    <td>${parseFloat(r.total_amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'occupancy' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-card-label">Occupied Units</div>
              <div className="stat-card-value" style={{ color: '#10b981' }}>{occupancySummary?.occupied || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Available Units</div>
              <div className="stat-card-value" style={{ color: '#fbbf24' }}>{occupancySummary?.available || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Reserved Units</div>
              <div className="stat-card-value" style={{ color: '#60a5fa' }}>{occupancySummary?.reserved || 0}</div>
            </div>
          </div>

          <h3 style={{ marginBottom: 12, fontSize: 16 }}>Detailed Occupancy by Type</h3>
          <div className="data-table-container">
            <table className="data-table">
              <thead><tr><th>Unit Type</th><th>Total</th><th>Occupied</th><th>Available</th><th>Reserved</th><th>Occupancy Rate</th></tr></thead>
              <tbody>
                {occupancyByType.map(r => (
                  <tr key={r.unit_type}>
                    <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>{r.unit_type}</td>
                    <td>{r.total}</td>
                    <td><span className="badge badge-green">{r.occupied}</span></td>
                    <td><span className="badge badge-yellow">{r.available}</span></td>
                    <td><span className="badge badge-blue">{r.reserved}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 12, background: '#334155', borderRadius: 6, maxWidth: 120 }}>
                          <div style={{ width: `${r.occupancy_rate}%`, height: '100%', background: parseFloat(r.occupancy_rate) > 80 ? '#10b981' : parseFloat(r.occupancy_rate) > 50 ? '#fbbf24' : '#f87171', borderRadius: 6 }} />
                        </div>
                        <span style={{ fontWeight: 600 }}>{r.occupancy_rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            {paymentStatus.map(p => (
              <div key={p.status} className="stat-card">
                <div className="stat-card-label" style={{ textTransform: 'capitalize' }}>{p.status}</div>
                <div className="stat-card-value" style={{ color: p.status === 'paid' ? '#10b981' : p.status === 'overdue' ? '#f87171' : '#fbbf24' }}>
                  ${parseFloat(p.total_amount).toFixed(2)}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{p.count} records</div>
              </div>
            ))}
          </div>

          <h3 style={{ marginBottom: 12, fontSize: 16 }}>Payment Status Breakdown</h3>
          <div className="data-table-container">
            <table className="data-table">
              <thead><tr><th>Status</th><th>Count</th><th>Total Amount</th><th>Share</th></tr></thead>
              <tbody>
                {paymentStatus.map(p => {
                  const totalBilling = paymentStatus.reduce((s, x) => s + parseFloat(x.total_amount || 0), 0);
                  return (
                    <tr key={p.status}>
                      <td><span className={`badge ${p.status === 'paid' ? 'badge-green' : p.status === 'overdue' ? 'badge-red' : 'badge-yellow'}`}>{p.status}</span></td>
                      <td>{p.count}</td>
                      <td>${parseFloat(p.total_amount).toFixed(2)}</td>
                      <td>{(parseFloat(p.total_amount) / totalBilling * 100).toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'maintenance' && (
        <div>
          <h3 style={{ marginBottom: 12, fontSize: 16 }}>Maintenance by Status & Priority</h3>
          <div className="data-table-container">
            <table className="data-table">
              <thead><tr><th>Status</th><th>Priority</th><th>Count</th><th>Estimated Cost</th></tr></thead>
              <tbody>
                {maintenanceSummary.map((m, i) => (
                  <tr key={i}>
                    <td><span className={`badge ${m.status === 'completed' ? 'badge-green' : m.status === 'in_progress' ? 'badge-blue' : m.status === 'scheduled' ? 'badge-purple' : 'badge-yellow'}`}>{m.status}</span></td>
                    <td><span className={`badge ${m.priority === 'urgent' ? 'badge-red' : m.priority === 'high' ? 'badge-yellow' : m.priority === 'medium' ? 'badge-blue' : 'badge-gray'}`}>{m.priority}</span></td>
                    <td>{m.count}</td>
                    <td>${parseFloat(m.total_cost || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'leases' && (
        <div>
          <h3 style={{ marginBottom: 12, fontSize: 16 }}>Lease Status Report</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {['expired', 'expiring_soon', 'upcoming', 'active'].map(status => {
              const count = leaseExpirations.filter(l => l.lease_status === status).length;
              const colors = { expired: '#f87171', expiring_soon: '#fbbf24', upcoming: '#60a5fa', active: '#10b981' };
              const labels = { expired: 'Expired', expiring_soon: 'Expiring Soon', upcoming: 'Upcoming (90d)', active: 'Active' };
              return (
                <div key={status} className="stat-card">
                  <div className="stat-card-label">{labels[status]}</div>
                  <div className="stat-card-value" style={{ color: colors[status] }}>{count}</div>
                </div>
              );
            })}
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead><tr><th>Tenant</th><th>Unit</th><th>Lease Start</th><th>Lease End</th><th>Status</th></tr></thead>
              <tbody>
                {leaseExpirations.map((l, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{l.first_name} {l.last_name}</td>
                    <td>{l.unit_number}</td>
                    <td>{l.lease_start ? new Date(l.lease_start).toLocaleDateString() : '—'}</td>
                    <td>{l.lease_end ? new Date(l.lease_end).toLocaleDateString() : '—'}</td>
                    <td><span className={`badge ${getStatusBadge(l.lease_status)}`}>{l.lease_status.replace(/_/g, ' ')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportsPage;
