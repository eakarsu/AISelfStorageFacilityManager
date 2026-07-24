const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const auth = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const unitsRoutes = require('./routes/units');
const pricingRoutes = require('./routes/pricing');
const occupancyRoutes = require('./routes/occupancy');
const climateRoutes = require('./routes/climate');
const securityRoutes = require('./routes/security');
const billingRoutes = require('./routes/billing');
const aiRoutes = require('./routes/ai');
const tenantsRoutes = require('./routes/tenants');
const maintenanceRoutes = require('./routes/maintenance');
const accessRoutes = require('./routes/access');
const insuranceRoutes = require('./routes/insurance');
const moveioRoutes = require('./routes/moveio');
const revenueRoutes = require('./routes/revenue');
const reportsRoutes = require('./routes/reports');
const promotionsRoutes = require('./routes/promotions');
const waitlistRoutes = require('./routes/waitlist');
const notificationsRoutes = require('./routes/notifications');
const facilitiesRoutes = require('./routes/facilities');
const pool = require('./db');

const app = express();
const PORT = process.env.SERVER_PORT || 4000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || `http://localhost:${process.env.CLIENT_PORT || 3000}`,
  credentials: true,
}));
app.use(express.json());

// Public routes
app.use('/api/auth', authRoutes);
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/facility-security-workflow', auth, require('./routes/facilitySecurityWorkflow'));
app.use(/^\/api\/(?:gap-|ai-)/, auth, (req, res) => res.status(503).json({
  error: 'Generated AI and gap routes are quarantined; use /api/facility-security-workflow',
  retryable: false,
}));
app.use('/api', auth);

// Protected routes (auth applied per-router)
app.use('/api/facilities', facilitiesRoutes);
app.use('/api/units', unitsRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/occupancy', occupancyRoutes);
app.use('/api/climate', climateRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/tenants', tenantsRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/moveio', moveioRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/promotions', promotionsRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/notifications', notificationsRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// AI feature mount: churn-prevention
app.use('/api/ai/churn-prevention', require('./routes/ai-churn-prevention'));
// === Batch 07 Gaps & Frontend Mounts ===
app.use('/api/gap-no-unitsizingrecommendation-rightsize-sugges', require('./routes/gap-no-unitsizingrecommendation-rightsize-sugges'));
app.use('/api/gap-no-churnprediction', require('./routes/gap-no-churnprediction'));
app.use('/api/gap-no-latepaymentrisk-collections-triage', require('./routes/gap-no-latepaymentrisk-collections-triage'));
app.use('/api/gap-no-securityalertanalysis-cameraalarm-summari', require('./routes/gap-no-securityalertanalysis-cameraalarm-summari'));
app.use('/api/gap-no-demand-forecasting-ai', require('./routes/gap-no-demand-forecasting-ai'));
app.use('/api/gap-no-tenant-portal-selfservice', require('./routes/gap-no-tenant-portal-selfservice'));
app.use('/api/gap-no-online-reservationpayment-workflow', require('./routes/gap-no-online-reservationpayment-workflow'));
app.use('/api/gap-no-autorenewal-lease-management', require('./routes/gap-no-autorenewal-lease-management'));
app.use('/api/gap-no-late-fee-automation', require('./routes/gap-no-late-fee-automation'));
app.use('/api/gap-no-auction-management-for-abandoned-units', require('./routes/gap-no-auction-management-for-abandoned-units'));
app.use('/api/gap-no-payment-gateway-integration', require('./routes/gap-no-payment-gateway-integration'));
app.use('/api/gap-no-public-webhook-system', require('./routes/gap-no-public-webhook-system'));
// === End Batch 07 ===

async function start() {
  const result=await pool.query("SELECT to_regclass('public.facility_security_cases') AS workflow_table");
  if(!result.rows[0].workflow_table) throw new Error('Database migrations are required; run ./scripts/migrate.sh');
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
start().catch(error=>{console.error('Failed to start server:',error.message);process.exitCode=1;});
