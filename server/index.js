const express = require('express');
const cors = require('cors');
require('dotenv').config();

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

const app = express();
const PORT = process.env.SERVER_PORT || 4000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
