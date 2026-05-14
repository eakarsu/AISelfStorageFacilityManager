# Audit Note — AISelfStorageFacilityManager

## Original audit recommendations (batch_07.md §26)

**Missing AI endpoints:** `/unit-sizing-recommendation`, `/churn-prediction`, `/late-payment-risk`, `/security-alert-analysis`.

**Missing non-AI features:** tenant portal, online reservation, lease auto-renewal, insurance verification, late fee automation, auction management.

**Custom suggestions:** dynamic pricing, predictive maintenance, churn prevention, occupancy forecasting/promos, tenant portfolio segmentation, security event intelligence.

## Implemented this pass (3 mechanical)
1. `POST /api/ai/unit-sizing-recommendation` — recommends unit size from items + budget + available sizes.
2. `POST /api/ai/churn-prediction` — at-risk tenants with retention offers.
3. `POST /api/ai/late-payment-risk` — bill-level late-payment risk + outreach scripts.

All three reuse `callOpenRouter`, `persistResult`, `auth`, `aiRateLimiter`. Syntax-checked.

## Backlog (prioritized)
1. `POST /api/ai/security-alert-analysis` (mechanical follow-up — summarize camera/alarm events).
2. Tenant portal (mechanical CRUD).
3. Online reservation flow (NEEDS-PRODUCT-DECISION + payment gateway).
4. Insurance verification (NEEDS-CREDS).
5. Auction management (mechanical, NEEDS legal review of state lien laws).

## Apply pass 3 (frontend)

LEFT-AS-IS. Frontend (React/CRA in `client/`) already covers all 3 pass-2 endpoints: `client/src/pages/UnitSizingPage.js` posts to `${API}/ai/unit-sizing-recommendation`, `ChurnPredictionPage.js` posts to `${API}/ai/churn-prediction`, `LatePaymentRiskPage.js` posts to `${API}/ai/late-payment-risk`. axios uses JWT Bearer from localStorage via existing interceptor; backend 503-no-key bubbles up as a JSON error. No FE changes needed. Backlog `security-alert-analysis` endpoint not yet implemented on backend, so no FE wiring is appropriate this pass.

## Apply pass 4 (mechanical backlog)

Implemented the one outstanding mechanical backlog item from pass 3 (security-alert-analysis):

- BE: `POST /api/ai/security-alert-analysis` in `server/routes/ai.js` — accepts `hours_back`, `include_resolved`, `focus_zones`; reads recent `security_events` (and per-event-type counts) and produces threat-level / clusters / prioritized alerts / false-positive candidates / recommended camera checks. Reuses existing `callOpenRouter`, `aiRateLimiter`, `auth`, `persistResult`. Adds explicit 503-on-no-key guard at the top of the handler (`OPENROUTER_API_KEY` check) so the FE can render the standard "AI service unavailable" message.
- FE: `client/src/pages/SecurityAlertAnalysisPage.js` (form: hours back, include resolved, comma-separated focus zones; JWT Bearer header from `token` prop; surfaces 503 with a configuration hint). Wired into `client/src/App.js` at `/ai/security-alert-analysis`.

`node --check server/routes/ai.js` passes. No new deps; no `npm install`.

Remaining backlog (unchanged): tenant portal (mechanical CRUD, deferred — too broad for this pass), online reservation (NEEDS-PRODUCT-DECISION + payment gateway), insurance verification (NEEDS-CREDS), auction management (NEEDS legal review).
