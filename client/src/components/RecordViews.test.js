import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import UnitsPage from '../pages/UnitsPage';
import BillingPage from '../pages/BillingPage';
import TenantsPage from '../pages/TenantsPage';
import AccessPage from '../pages/AccessPage';
import ClimatePage from '../pages/ClimatePage';
import InsurancePage from '../pages/InsurancePage';
import MaintenancePage from '../pages/MaintenancePage';
import MoveIOPage from '../pages/MoveIOPage';
import NotificationsPage from '../pages/NotificationsPage';
import OccupancyPage from '../pages/OccupancyPage';
import PricingPage from '../pages/PricingPage';
import PromotionsPage from '../pages/PromotionsPage';
import RevenuePage from '../pages/RevenuePage';
import SecurityPage from '../pages/SecurityPage';
import WaitlistPage from '../pages/WaitlistPage';

jest.mock('axios');
global.IS_REACT_ACT_ENVIRONMENT = true;

const rows = Array.from({ length: 16 }, (_, index) => ({
  id: index + 1,
  title: `Fixture Alert ${index + 1}`,
  event_type: 'gate_access',
  event_time: '2026-10-11T12:00:00Z',
  severity: 'low',
  unit_number: `A-${String(index + 1).padStart(3, '0')}`,
  size_sqft: 100,
  unit_type: 'standard',
  status: 'available',
  monthly_rate: '125.00',
  tenant_name: `Sample Tenant ${index + 1}`,
  first_name: 'Sample',
  last_name: `Tenant ${index + 1}`,
  amount: '125.00',
  due_date: '2026-10-15T00:00:00Z',
}));

test.each([
  [UnitsPage, { data: rows, pagination: { total: 16 } }],
  [BillingPage, { data: rows, pagination: { total: 16 } }],
  [TenantsPage, rows],
  [AccessPage, rows],
  [ClimatePage, rows],
  [InsurancePage, rows],
  [MaintenancePage, rows],
  [MoveIOPage, rows],
  [NotificationsPage, rows],
  [OccupancyPage, rows],
  [PricingPage, rows],
  [PromotionsPage, rows],
  [RevenuePage, rows],
  [SecurityPage, rows],
  [WaitlistPage, rows],
])('%p renders 16 API records without console errors', async (Page, payload) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  axios.get.mockResolvedValue({ data: payload });
  try {
    await act(async () => { root.render(<Page token="fixture-token" />); });
    if (Page === NotificationsPage) {
      expect((container.textContent.match(/Fixture Alert/g) || [])).toHaveLength(16);
    } else {
      expect(container.querySelectorAll('tbody tr')).toHaveLength(16);
    }
    expect(error).not.toHaveBeenCalled();
  } finally {
    await act(async () => root.unmount());
    container.remove();
    error.mockRestore();
    axios.get.mockReset();
  }
});
