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
import UnitSizingPage from './pages/UnitSizingPage';
import ChurnPredictionPage from './pages/ChurnPredictionPage';
import LatePaymentRiskPage from './pages/LatePaymentRiskPage';
import SecurityAlertAnalysisPage from './pages/SecurityAlertAnalysisPage';
import Layout from './components/Layout';

// === Batch 07 Gaps & Frontend Mounts ===
import CfDynamicPricingByUnitTypelocation from './pages/CfDynamicPricingByUnitTypelocation';
import CfPredictiveMaintenanceScheduling from './pages/CfPredictiveMaintenanceScheduling';
import CfChurnPreventionProgram from './pages/CfChurnPreventionProgram';
import CfOccupancyForecastingPromotions from './pages/CfOccupancyForecastingPromotions';
import CfTenantPortfolioSegmentation from './pages/CfTenantPortfolioSegmentation';
import CfSecurityEventIntelligence from './pages/CfSecurityEventIntelligence';
import GapNoUnitsizingrecommendationRightsizeSugges from './pages/GapNoUnitsizingrecommendationRightsizeSugges';
import GapNoChurnprediction from './pages/GapNoChurnprediction';
import GapNoLatepaymentriskCollectionsTriage from './pages/GapNoLatepaymentriskCollectionsTriage';
import GapNoSecurityalertanalysisCameraalarmSummari from './pages/GapNoSecurityalertanalysisCameraalarmSummari';
import GapNoDemandForecastingAi from './pages/GapNoDemandForecastingAi';
import GapNoTenantPortalSelfservice from './pages/GapNoTenantPortalSelfservice';
import GapNoOnlineReservationpaymentWorkflow from './pages/GapNoOnlineReservationpaymentWorkflow';
import GapNoAutorenewalLeaseManagement from './pages/GapNoAutorenewalLeaseManagement';
import GapNoLateFeeAutomation from './pages/GapNoLateFeeAutomation';
import GapNoAuctionManagementForAbandonedUnits from './pages/GapNoAuctionManagementForAbandonedUnits';
import GapNoPaymentGatewayIntegration from './pages/GapNoPaymentGatewayIntegration';
import GapNoPublicWebhookSystem from './pages/GapNoPublicWebhookSystem';
// === End Batch 07 ===


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
          <Route path="/ai/unit-sizing" element={<UnitSizingPage token={token} />} />
          <Route path="/ai/churn-prediction" element={<ChurnPredictionPage token={token} />} />
          <Route path="/ai/late-payment-risk" element={<LatePaymentRiskPage token={token} />} />
          <Route path="/ai/security-alert-analysis" element={<SecurityAlertAnalysisPage token={token} />} />
          <Route path="*" element={<Navigate to="/" />} />
          // === Batch 07 Gaps & Frontend Mounts ===
          <Route path='/cf-dynamic-pricing-by-unit-typelocation' element={<CfDynamicPricingByUnitTypelocation />} />
          <Route path='/cf-predictive-maintenance-scheduling' element={<CfPredictiveMaintenanceScheduling />} />
          <Route path='/cf-churn-prevention-program' element={<CfChurnPreventionProgram />} />
          <Route path='/cf-occupancy-forecasting-promotions' element={<CfOccupancyForecastingPromotions />} />
          <Route path='/cf-tenant-portfolio-segmentation' element={<CfTenantPortfolioSegmentation />} />
          <Route path='/cf-security-event-intelligence' element={<CfSecurityEventIntelligence />} />
          <Route path='/gap-no-unitsizingrecommendation-rightsize-sugges' element={<GapNoUnitsizingrecommendationRightsizeSugges />} />
          <Route path='/gap-no-churnprediction' element={<GapNoChurnprediction />} />
          <Route path='/gap-no-latepaymentrisk-collections-triage' element={<GapNoLatepaymentriskCollectionsTriage />} />
          <Route path='/gap-no-securityalertanalysis-cameraalarm-summari' element={<GapNoSecurityalertanalysisCameraalarmSummari />} />
          <Route path='/gap-no-demand-forecasting-ai' element={<GapNoDemandForecastingAi />} />
          <Route path='/gap-no-tenant-portal-selfservice' element={<GapNoTenantPortalSelfservice />} />
          <Route path='/gap-no-online-reservationpayment-workflow' element={<GapNoOnlineReservationpaymentWorkflow />} />
          <Route path='/gap-no-autorenewal-lease-management' element={<GapNoAutorenewalLeaseManagement />} />
          <Route path='/gap-no-late-fee-automation' element={<GapNoLateFeeAutomation />} />
          <Route path='/gap-no-auction-management-for-abandoned-units' element={<GapNoAuctionManagementForAbandonedUnits />} />
          <Route path='/gap-no-payment-gateway-integration' element={<GapNoPaymentGatewayIntegration />} />
          <Route path='/gap-no-public-webhook-system' element={<GapNoPublicWebhookSystem />} />
          // === End Batch 07 ===
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
