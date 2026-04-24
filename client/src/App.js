import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UnitsPage from './pages/UnitsPage';
import PricingPage from './pages/PricingPage';
import OccupancyPage from './pages/OccupancyPage';
import ClimatePage from './pages/ClimatePage';
import SecurityPage from './pages/SecurityPage';
import BillingPage from './pages/BillingPage';
import TenantsPage from './pages/TenantsPage';
import MaintenancePage from './pages/MaintenancePage';
import AccessPage from './pages/AccessPage';
import InsurancePage from './pages/InsurancePage';
import MoveIOPage from './pages/MoveIOPage';
import RevenuePage from './pages/RevenuePage';
import ReportsPage from './pages/ReportsPage';
import PromotionsPage from './pages/PromotionsPage';
import WaitlistPage from './pages/WaitlistPage';
import NotificationsPage from './pages/NotificationsPage';
import Layout from './components/Layout';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));

  const handleLogin = (tokenVal, userVal) => {
    localStorage.setItem('token', tokenVal);
    localStorage.setItem('user', JSON.stringify(userVal));
    setToken(tokenVal);
    setUser(userVal);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/units" element={<UnitsPage token={token} />} />
          <Route path="/pricing" element={<PricingPage token={token} />} />
          <Route path="/occupancy" element={<OccupancyPage token={token} />} />
          <Route path="/climate" element={<ClimatePage token={token} />} />
          <Route path="/security" element={<SecurityPage token={token} />} />
          <Route path="/billing" element={<BillingPage token={token} />} />
          <Route path="/tenants" element={<TenantsPage token={token} />} />
          <Route path="/maintenance" element={<MaintenancePage token={token} />} />
          <Route path="/access" element={<AccessPage token={token} />} />
          <Route path="/insurance" element={<InsurancePage token={token} />} />
          <Route path="/moveio" element={<MoveIOPage token={token} />} />
          <Route path="/revenue" element={<RevenuePage token={token} />} />
          <Route path="/reports" element={<ReportsPage token={token} />} />
          <Route path="/promotions" element={<PromotionsPage token={token} />} />
          <Route path="/waitlist" element={<WaitlistPage token={token} />} />
          <Route path="/notifications" element={<NotificationsPage token={token} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
