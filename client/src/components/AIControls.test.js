import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import axios from 'axios';
import AIOutput from './AIOutput';
import Login from '../pages/Login';
import ChurnPredictionPage from '../pages/ChurnPredictionPage';
import LatePaymentRiskPage from '../pages/LatePaymentRiskPage';
import UnitSizingPage from '../pages/UnitSizingPage';
import SecurityAlertAnalysisPage from '../pages/SecurityAlertAnalysisPage';

jest.mock('axios');
global.IS_REACT_ACT_ENVIRONMENT = true;
let container, root;
const render = async component => { await act(async () => { root.render(component); }); };
const click = async element => { await act(async () => { element.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); };
beforeEach(() => { container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); axios.post.mockReset(); localStorage.clear(); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

test('returned output preserves false, zero, empty strings, lists, and nested facts', async () => {
  await render(<AIOutput title="Fixture" data={{ result: { summary: '', enabled: false, count: 0, details: { location: 'Gate A' }, findings: [{ risk: 'low', impact: 0 }] } }} />);
  for (const text of ['Summary', 'Enabled', 'No', 'Count', '0', 'Gate A']) expect(container.textContent).toContain(text);
  expect(container.querySelector('table')).not.toBeNull();
  expect(container.querySelector('pre')).toBeNull();
});

test.each([
  [ChurnPredictionPage, 'Quarterly review', 2, ['90', 'false']],
  [LatePaymentRiskPage, 'Weekly triage', 2, ['7', 'false']],
  [SecurityAlertAnalysisPage, 'Weekend review', 3, ['72', 'true', 'parking lot, perimeter']],
  [UnitSizingPage, 'Business archive', 4, ['Forty document boxes', '140', 'true', '5x5,5x10,10x10']],
])('preset fills every input without generation', async (Page, label, count, expected) => {
  await render(<Page token="fixture-token" />);
  await click([...container.querySelectorAll('button')].find(button => button.textContent === label));
  const inputs = [...container.querySelectorAll('input,select,textarea')];
  expect(inputs).toHaveLength(count);
  expected.forEach(text => expect(inputs.some(input => String(input.value).includes(text))).toBe(true));
  expect(axios.post).not.toHaveBeenCalled();
});

test('demo login uses dedicated endpoint only when clicked', async () => {
  const onLogin = jest.fn();
  axios.post.mockResolvedValue({ data: { token: 'fixture-token', user: { id: 1 } } });
  await render(<Login onLogin={onLogin} />);
  expect(axios.post).not.toHaveBeenCalled();
  const button = [...container.querySelectorAll('button')].find(node => node.textContent === 'Log In as Demo');
  expect(button.type).toBe('button');
  await click(button);
  expect(axios.post).toHaveBeenCalledWith(expect.stringMatching(/\/auth\/demo-login$/));
  expect(onLogin).toHaveBeenCalled();
});

test('saved report detail displays structured result', async () => {
  localStorage.setItem('token', 'fixture-token');
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [{ id: 5, created_at: '2026-01-01T12:00:00Z', result: '{"enabled":false,"count":0,"facts":{"location":"Gate B"}}' }] }) });
  await render(<AIOutput title="Churn Prediction" data={null} />);
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  await click(container.querySelector('.ai-history-row'));
  for (const text of ['Saved Churn Prediction report', 'Gate B', 'No']) expect(container.textContent).toContain(text);
  expect(container.querySelector('pre')).toBeNull();
});
