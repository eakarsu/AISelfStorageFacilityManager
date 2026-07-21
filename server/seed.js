const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();
if (process.env.ALLOW_DESTRUCTIVE_SEED !== 'true') throw new Error('Set ALLOW_DESTRUCTIVE_SEED=true to run the destructive seed explicitly');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
if (!process.env.SEED_ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD.length < 12) throw new Error('SEED_ADMIN_PASSWORD must contain at least 12 characters');

async function seed() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Drop existing tables
    await pool.query(`
      DROP TABLE IF EXISTS notifications CASCADE;
      DROP TABLE IF EXISTS waitlist CASCADE;
      DROP TABLE IF EXISTS promotions CASCADE;
      DROP TABLE IF EXISTS revenue_records CASCADE;
      DROP TABLE IF EXISTS move_activities CASCADE;
      DROP TABLE IF EXISTS insurance_policies CASCADE;
      DROP TABLE IF EXISTS access_logs CASCADE;
      DROP TABLE IF EXISTS maintenance_requests CASCADE;
      DROP TABLE IF EXISTS tenants CASCADE;
      DROP TABLE IF EXISTS billing_records CASCADE;
      DROP TABLE IF EXISTS security_events CASCADE;
      DROP TABLE IF EXISTS climate_controls CASCADE;
      DROP TABLE IF EXISTS occupancy_forecasts CASCADE;
      DROP TABLE IF EXISTS pricing_rules CASCADE;
      DROP TABLE IF EXISTS storage_units CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);

    // Create tables
    await pool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'manager',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE storage_units (
        id SERIAL PRIMARY KEY,
        unit_number VARCHAR(20) UNIQUE NOT NULL,
        size_sqft INTEGER NOT NULL,
        unit_type VARCHAR(50) NOT NULL,
        climate_controlled BOOLEAN DEFAULT false,
        floor_level INTEGER DEFAULT 1,
        monthly_rate DECIMAL(10,2) NOT NULL,
        status VARCHAR(30) DEFAULT 'available',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE pricing_rules (
        id SERIAL PRIMARY KEY,
        rule_name VARCHAR(255) NOT NULL,
        unit_type VARCHAR(50) NOT NULL,
        base_price DECIMAL(10,2) NOT NULL,
        demand_multiplier DECIMAL(5,2) DEFAULT 1.0,
        season VARCHAR(20),
        min_price DECIMAL(10,2),
        max_price DECIMAL(10,2),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE occupancy_forecasts (
        id SERIAL PRIMARY KEY,
        forecast_date DATE NOT NULL,
        predicted_occupancy DECIMAL(5,2) NOT NULL,
        actual_occupancy DECIMAL(5,2),
        unit_type VARCHAR(50),
        confidence_score DECIMAL(5,2),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE climate_controls (
        id SERIAL PRIMARY KEY,
        zone_name VARCHAR(100) NOT NULL,
        current_temp DECIMAL(5,1) NOT NULL,
        target_temp DECIMAL(5,1) NOT NULL,
        current_humidity DECIMAL(5,1),
        target_humidity DECIMAL(5,1),
        hvac_status VARCHAR(20) DEFAULT 'auto',
        energy_usage_kwh DECIMAL(10,2),
        last_maintenance DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE security_events (
        id SERIAL PRIMARY KEY,
        event_type VARCHAR(50) NOT NULL,
        location VARCHAR(100) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        description TEXT,
        camera_id VARCHAR(20),
        resolved BOOLEAN DEFAULT false,
        resolved_by VARCHAR(100),
        event_time TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE billing_records (
        id SERIAL PRIMARY KEY,
        tenant_name VARCHAR(255) NOT NULL,
        tenant_email VARCHAR(255),
        unit_number VARCHAR(20) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        due_date DATE NOT NULL,
        status VARCHAR(30) DEFAULT 'pending',
        payment_method VARCHAR(50),
        auto_pay BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE tenants (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        unit_number VARCHAR(20),
        lease_start DATE,
        lease_end DATE,
        emergency_contact VARCHAR(255),
        id_verified BOOLEAN DEFAULT false,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE maintenance_requests (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        location VARCHAR(100),
        priority VARCHAR(20) DEFAULT 'medium',
        status VARCHAR(30) DEFAULT 'open',
        assigned_to VARCHAR(100),
        requested_by VARCHAR(100),
        estimated_cost DECIMAL(10,2),
        completed_date DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE access_logs (
        id SERIAL PRIMARY KEY,
        tenant_name VARCHAR(255) NOT NULL,
        unit_number VARCHAR(20),
        access_type VARCHAR(30) NOT NULL,
        access_method VARCHAR(30),
        access_time TIMESTAMP DEFAULT NOW(),
        granted BOOLEAN DEFAULT true,
        denied_reason VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE insurance_policies (
        id SERIAL PRIMARY KEY,
        tenant_name VARCHAR(255) NOT NULL,
        unit_number VARCHAR(20),
        provider VARCHAR(255),
        policy_number VARCHAR(50),
        coverage_amount DECIMAL(10,2),
        monthly_premium DECIMAL(10,2),
        start_date DATE,
        end_date DATE,
        status VARCHAR(30) DEFAULT 'active',
        coverage_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE move_activities (
        id SERIAL PRIMARY KEY,
        tenant_name VARCHAR(255) NOT NULL,
        unit_number VARCHAR(20),
        activity_type VARCHAR(20) NOT NULL,
        scheduled_date DATE,
        completed_date DATE,
        status VARCHAR(30) DEFAULT 'scheduled',
        requires_elevator BOOLEAN DEFAULT false,
        special_instructions TEXT,
        staff_assigned VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE revenue_records (
        id SERIAL PRIMARY KEY,
        category VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        description VARCHAR(255),
        transaction_date DATE NOT NULL,
        payment_method VARCHAR(50),
        tenant_name VARCHAR(255),
        unit_number VARCHAR(20),
        period_month INTEGER,
        period_year INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE promotions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        discount_type VARCHAR(30) NOT NULL,
        discount_value DECIMAL(10,2) NOT NULL,
        unit_type VARCHAR(50) DEFAULT 'all',
        start_date DATE,
        end_date DATE,
        promo_code VARCHAR(50) UNIQUE,
        max_uses INTEGER DEFAULT 0,
        current_uses INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE waitlist (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        desired_unit_type VARCHAR(50),
        desired_size_sqft INTEGER,
        climate_controlled BOOLEAN DEFAULT false,
        max_budget DECIMAL(10,2),
        notes TEXT,
        status VARCHAR(30) DEFAULT 'waiting',
        notified_date DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE notifications (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        related_entity VARCHAR(50),
        related_id VARCHAR(100),
        is_read BOOLEAN DEFAULT false,
        is_auto_generated BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Tables created.');

    // Seed Users
    const passwordHash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD, 12);
    await pool.query(`
      INSERT INTO users (email, password_hash, name, role) VALUES
      ('admin@storagepro.com', '${passwordHash}', 'John Manager', 'admin'),
      ('staff@storagepro.com', '${passwordHash}', 'Jane Staff', 'staff')
    `);
    console.log('Users seeded.');

    // Seed Storage Units (18 items)
    await pool.query(`
      INSERT INTO storage_units (unit_number, size_sqft, unit_type, climate_controlled, floor_level, monthly_rate, status) VALUES
      ('A-101', 25, 'small', false, 1, 49.99, 'occupied'),
      ('A-102', 25, 'small', false, 1, 49.99, 'available'),
      ('A-103', 50, 'small', true, 1, 79.99, 'occupied'),
      ('A-201', 50, 'small', false, 2, 44.99, 'available'),
      ('B-101', 100, 'medium', false, 1, 99.99, 'occupied'),
      ('B-102', 100, 'medium', true, 1, 129.99, 'occupied'),
      ('B-103', 100, 'medium', false, 1, 99.99, 'reserved'),
      ('B-201', 100, 'medium', true, 2, 119.99, 'occupied'),
      ('B-202', 100, 'medium', false, 2, 89.99, 'available'),
      ('C-101', 200, 'large', false, 1, 179.99, 'occupied'),
      ('C-102', 200, 'large', true, 1, 219.99, 'occupied'),
      ('C-103', 200, 'large', false, 1, 179.99, 'available'),
      ('C-201', 200, 'large', true, 2, 209.99, 'reserved'),
      ('D-101', 300, 'extra-large', false, 1, 269.99, 'occupied'),
      ('D-102', 300, 'extra-large', true, 1, 319.99, 'occupied'),
      ('D-103', 400, 'extra-large', false, 1, 349.99, 'available'),
      ('E-101', 50, 'vehicle', false, 1, 149.99, 'occupied'),
      ('E-102', 100, 'vehicle', false, 1, 199.99, 'available')
    `);
    console.log('Storage units seeded (18 items).');

    // Seed Pricing Rules (16 items)
    await pool.query(`
      INSERT INTO pricing_rules (rule_name, unit_type, base_price, demand_multiplier, season, min_price, max_price, is_active) VALUES
      ('Small Unit Base', 'small', 49.99, 1.0, 'all', 39.99, 69.99, true),
      ('Small Climate Premium', 'small', 79.99, 1.2, 'all', 69.99, 99.99, true),
      ('Medium Unit Base', 'medium', 99.99, 1.0, 'all', 79.99, 139.99, true),
      ('Medium Climate Premium', 'medium', 129.99, 1.15, 'all', 109.99, 159.99, true),
      ('Large Unit Base', 'large', 179.99, 1.0, 'all', 149.99, 229.99, true),
      ('Large Climate Premium', 'large', 219.99, 1.1, 'all', 189.99, 269.99, true),
      ('XL Unit Base', 'extra-large', 269.99, 1.0, 'all', 229.99, 349.99, true),
      ('XL Climate Premium', 'extra-large', 319.99, 1.1, 'all', 279.99, 399.99, true),
      ('Vehicle Storage Base', 'vehicle', 149.99, 1.0, 'all', 129.99, 199.99, true),
      ('Summer Surge Small', 'small', 49.99, 1.35, 'summer', 49.99, 79.99, true),
      ('Summer Surge Medium', 'medium', 99.99, 1.3, 'summer', 99.99, 149.99, true),
      ('Summer Surge Large', 'large', 179.99, 1.25, 'summer', 179.99, 249.99, true),
      ('Winter Discount Small', 'small', 49.99, 0.85, 'winter', 35.99, 49.99, true),
      ('Winter Discount Medium', 'medium', 99.99, 0.9, 'winter', 79.99, 99.99, true),
      ('New Customer Promo', 'small', 49.99, 0.5, 'all', 24.99, 49.99, true),
      ('Long-term Loyalty', 'medium', 99.99, 0.8, 'all', 74.99, 99.99, false)
    `);
    console.log('Pricing rules seeded (16 items).');

    // Seed Occupancy Forecasts (16 items)
    await pool.query(`
      INSERT INTO occupancy_forecasts (forecast_date, predicted_occupancy, actual_occupancy, unit_type, confidence_score, notes) VALUES
      ('2026-01-01', 72.5, 71.0, 'small', 92.0, 'Post-holiday slight decline expected'),
      ('2026-01-15', 73.0, 72.5, 'small', 90.0, 'Stable winter occupancy'),
      ('2026-02-01', 74.0, 73.5, 'medium', 88.0, 'Gradual increase as spring approaches'),
      ('2026-02-15', 75.5, 76.0, 'medium', 91.0, 'College students booking for spring'),
      ('2026-03-01', 78.0, 79.0, 'large', 87.0, 'Spring moving season beginning'),
      ('2026-03-15', 81.0, NULL, 'large', 85.0, 'Expected uptick from corporate relocations'),
      ('2026-04-01', 84.5, NULL, 'small', 82.0, 'Spring peak season approaching'),
      ('2026-04-15', 87.0, NULL, 'medium', 80.0, 'High demand period beginning'),
      ('2026-05-01', 91.0, NULL, 'extra-large', 78.0, 'Summer move-in surge expected'),
      ('2026-05-15', 93.5, NULL, 'small', 76.0, 'Peak summer occupancy projected'),
      ('2026-06-01', 95.0, NULL, 'medium', 75.0, 'Maximum seasonal occupancy'),
      ('2026-06-15', 94.0, NULL, 'large', 74.0, 'Slight plateau at peak'),
      ('2026-07-01', 92.0, NULL, 'vehicle', 73.0, 'Summer vehicle storage demand'),
      ('2026-08-01', 89.0, NULL, 'small', 72.0, 'Back-to-school transitions'),
      ('2026-09-01', 85.0, NULL, 'medium', 70.0, 'Post-summer decline begins'),
      ('2026-10-01', 80.0, NULL, 'large', 68.0, 'Fall seasonal adjustment')
    `);
    console.log('Occupancy forecasts seeded (16 items).');

    // Seed Climate Controls (16 items)
    await pool.query(`
      INSERT INTO climate_controls (zone_name, current_temp, target_temp, current_humidity, target_humidity, hvac_status, energy_usage_kwh, last_maintenance) VALUES
      ('Building A - Floor 1', 68.5, 68.0, 45.0, 45.0, 'cooling', 125.5, '2026-02-15'),
      ('Building A - Floor 2', 69.0, 68.0, 47.0, 45.0, 'cooling', 118.3, '2026-02-15'),
      ('Building B - Floor 1 West', 67.5, 68.0, 44.0, 45.0, 'heating', 130.2, '2026-01-20'),
      ('Building B - Floor 1 East', 68.0, 68.0, 45.5, 45.0, 'auto', 110.8, '2026-01-20'),
      ('Building B - Floor 2 West', 70.0, 68.0, 48.0, 45.0, 'cooling', 145.6, '2026-03-01'),
      ('Building B - Floor 2 East', 68.2, 68.0, 44.5, 45.0, 'auto', 105.4, '2026-03-01'),
      ('Building C - Floor 1', 66.0, 68.0, 42.0, 45.0, 'heating', 155.0, '2025-12-10'),
      ('Building C - Floor 2', 71.0, 68.0, 50.0, 45.0, 'cooling', 168.2, '2025-12-10'),
      ('Building D - Ground', 65.5, 65.0, 40.0, 42.0, 'auto', 98.5, '2026-02-28'),
      ('Vehicle Bay - Section 1', 60.0, 55.0, 35.0, 38.0, 'off', 45.0, '2026-01-15'),
      ('Vehicle Bay - Section 2', 62.0, 55.0, 37.0, 38.0, 'cooling', 52.3, '2026-01-15'),
      ('Wine Storage Vault', 55.0, 55.0, 70.0, 70.0, 'auto', 200.5, '2026-03-10'),
      ('Document Archive Room', 65.0, 65.0, 35.0, 35.0, 'auto', 88.0, '2026-02-20'),
      ('Electronics Storage', 64.0, 64.0, 30.0, 30.0, 'auto', 95.5, '2026-02-25'),
      ('Art & Antiques Vault', 68.0, 68.0, 50.0, 50.0, 'auto', 175.0, '2026-03-05'),
      ('Outdoor Covered Units', 72.0, 70.0, 55.0, 50.0, 'cooling', 65.0, '2026-01-30')
    `);
    console.log('Climate controls seeded (16 items).');

    // Seed Security Events (18 items)
    await pool.query(`
      INSERT INTO security_events (event_type, location, severity, description, camera_id, resolved, resolved_by, event_time) VALUES
      ('unauthorized_access', 'Gate A - Main Entrance', 'high', 'Attempted entry with expired access code at 2:30 AM', 'CAM-01', true, 'Security Team', '2026-03-19 02:30:00'),
      ('motion_detected', 'Building B - Hallway 2', 'low', 'Motion detected after hours, confirmed as maintenance staff', 'CAM-08', true, 'System Auto', '2026-03-19 22:15:00'),
      ('door_forced', 'Unit C-102', 'critical', 'Unit door forced open, lock mechanism damaged', 'CAM-12', false, NULL, '2026-03-18 03:45:00'),
      ('camera_offline', 'Parking Lot East', 'medium', 'Camera CAM-15 went offline, possible power issue', 'CAM-15', true, 'Tech Support', '2026-03-18 14:00:00'),
      ('fire_alarm', 'Building A - Floor 2', 'critical', 'Smoke detector triggered, false alarm from dust', 'CAM-05', true, 'Fire Dept', '2026-03-17 11:30:00'),
      ('loitering', 'Loading Dock', 'medium', 'Unidentified person loitering near loading dock for 30 min', 'CAM-20', true, 'Patrol Officer', '2026-03-17 19:45:00'),
      ('gate_malfunction', 'Gate B - Side Entrance', 'medium', 'Gate failed to close automatically after vehicle exit', 'CAM-03', true, 'Maintenance', '2026-03-16 16:20:00'),
      ('unauthorized_access', 'Building D - Restricted', 'high', 'Non-tenant badge used to access restricted area', 'CAM-18', false, NULL, '2026-03-16 01:15:00'),
      ('power_outage', 'Building C - All', 'high', 'Complete power loss in Building C for 45 minutes', 'CAM-10', true, 'Electrician', '2026-03-15 08:00:00'),
      ('vandalism', 'Exterior Wall - South', 'medium', 'Graffiti found on south exterior wall', 'CAM-22', false, NULL, '2026-03-15 06:00:00'),
      ('motion_detected', 'Vehicle Bay - Section 2', 'low', 'Raccoon triggered motion sensor', 'CAM-19', true, 'System Auto', '2026-03-14 23:30:00'),
      ('water_leak', 'Building A - Floor 1', 'high', 'Water leak detected near units A-101 through A-103', 'CAM-02', true, 'Plumber', '2026-03-14 07:15:00'),
      ('tailgating', 'Gate A - Main Entrance', 'medium', 'Vehicle followed another through gate without scanning', 'CAM-01', true, 'Security Team', '2026-03-13 17:30:00'),
      ('alarm_triggered', 'Unit D-101', 'high', 'Individual unit alarm triggered, tenant verified', 'CAM-16', true, 'Manager', '2026-03-13 10:00:00'),
      ('suspicious_vehicle', 'Parking Lot West', 'medium', 'Unknown vehicle parked for 6+ hours, not registered', 'CAM-21', false, NULL, '2026-03-12 20:00:00'),
      ('access_after_hours', 'Building B - Floor 1', 'low', 'Tenant access at 11 PM, within allowed after-hours window', 'CAM-07', true, 'System Auto', '2026-03-12 23:00:00'),
      ('equipment_failure', 'Building C - HVAC', 'medium', 'HVAC control panel showing error codes', 'CAM-11', false, NULL, '2026-03-11 14:30:00'),
      ('perimeter_breach', 'Fence - Northeast', 'critical', 'Fence cut detected by vibration sensor', 'CAM-23', false, NULL, '2026-03-10 04:00:00')
    `);
    console.log('Security events seeded (18 items).');

    // Seed Billing Records (18 items)
    await pool.query(`
      INSERT INTO billing_records (tenant_name, tenant_email, unit_number, amount, due_date, status, payment_method, auto_pay) VALUES
      ('Michael Chen', 'mchen@email.com', 'A-101', 49.99, '2026-04-01', 'pending', 'credit_card', true),
      ('Sarah Williams', 'swilliams@email.com', 'A-103', 79.99, '2026-04-01', 'pending', 'bank_transfer', true),
      ('Robert Johnson', 'rjohnson@email.com', 'B-101', 99.99, '2026-04-01', 'pending', 'credit_card', false),
      ('Emily Davis', 'edavis@email.com', 'B-102', 129.99, '2026-04-01', 'pending', 'credit_card', true),
      ('James Wilson', 'jwilson@email.com', 'B-201', 119.99, '2026-04-01', 'pending', 'paypal', false),
      ('Lisa Anderson', 'landerson@email.com', 'C-101', 179.99, '2026-04-01', 'pending', 'bank_transfer', true),
      ('David Martinez', 'dmartinez@email.com', 'C-102', 219.99, '2026-04-01', 'pending', 'credit_card', true),
      ('Jennifer Taylor', 'jtaylor@email.com', 'D-101', 269.99, '2026-04-01', 'pending', 'credit_card', false),
      ('Thomas Brown', 'tbrown@email.com', 'D-102', 319.99, '2026-04-01', 'pending', 'bank_transfer', true),
      ('Amanda White', 'awhite@email.com', 'E-101', 149.99, '2026-04-01', 'pending', 'credit_card', false),
      ('Chris Lee', 'clee@email.com', 'A-101', 49.99, '2026-03-01', 'paid', 'credit_card', true),
      ('Sarah Williams', 'swilliams@email.com', 'A-103', 79.99, '2026-03-01', 'paid', 'bank_transfer', true),
      ('Robert Johnson', 'rjohnson@email.com', 'B-101', 99.99, '2026-03-01', 'overdue', 'credit_card', false),
      ('Emily Davis', 'edavis@email.com', 'B-102', 129.99, '2026-03-01', 'paid', 'credit_card', true),
      ('James Wilson', 'jwilson@email.com', 'B-201', 119.99, '2026-03-01', 'overdue', 'paypal', false),
      ('Lisa Anderson', 'landerson@email.com', 'C-101', 179.99, '2026-03-01', 'paid', 'bank_transfer', true),
      ('Thomas Brown', 'tbrown@email.com', 'D-102', 319.99, '2026-02-01', 'paid', 'bank_transfer', true),
      ('Jennifer Taylor', 'jtaylor@email.com', 'D-101', 269.99, '2026-02-01', 'paid', 'credit_card', false)
    `);
    console.log('Billing records seeded (18 items).');

    // Seed Tenants (16 items)
    await pool.query(`
      INSERT INTO tenants (first_name, last_name, email, phone, unit_number, lease_start, lease_end, emergency_contact, id_verified, notes) VALUES
      ('Michael', 'Chen', 'mchen@email.com', '555-0101', 'A-101', '2025-06-01', '2026-06-01', 'Wei Chen - 555-0201', true, 'Long-term tenant, always pays on time'),
      ('Sarah', 'Williams', 'swilliams@email.com', '555-0102', 'A-103', '2025-09-15', '2026-09-15', 'Mark Williams - 555-0202', true, 'Climate-controlled unit for antiques'),
      ('Robert', 'Johnson', 'rjohnson@email.com', '555-0103', 'B-101', '2025-03-01', '2026-03-01', 'Carol Johnson - 555-0203', true, 'Lease expiring soon, needs follow-up'),
      ('Emily', 'Davis', 'edavis@email.com', '555-0104', 'B-102', '2025-11-01', '2026-11-01', 'Tom Davis - 555-0204', true, 'Stores business inventory'),
      ('James', 'Wilson', 'jwilson@email.com', '555-0105', 'B-201', '2025-07-15', '2026-07-15', 'Nancy Wilson - 555-0205', false, 'Needs to provide updated ID'),
      ('Lisa', 'Anderson', 'landerson@email.com', '555-0106', 'C-101', '2025-04-01', '2026-04-01', 'Paul Anderson - 555-0206', true, 'Corporate account - furniture storage'),
      ('David', 'Martinez', 'dmartinez@email.com', '555-0107', 'C-102', '2025-08-01', '2026-08-01', 'Maria Martinez - 555-0207', true, 'Art collection, requires climate control'),
      ('Jennifer', 'Taylor', 'jtaylor@email.com', '555-0108', 'D-101', '2025-10-01', '2026-10-01', 'Steve Taylor - 555-0208', true, 'Moving company, bulk storage'),
      ('Thomas', 'Brown', 'tbrown@email.com', '555-0109', 'D-102', '2025-05-01', '2026-05-01', 'Linda Brown - 555-0209', true, 'Wine collection storage'),
      ('Amanda', 'White', 'awhite@email.com', '555-0110', 'E-101', '2025-12-01', '2026-12-01', 'Greg White - 555-0210', true, 'Classic car storage'),
      ('Kevin', 'Garcia', 'kgarcia@email.com', '555-0111', 'A-201', '2026-01-15', '2027-01-15', 'Rosa Garcia - 555-0211', true, 'Student, seasonal storage'),
      ('Patricia', 'Moore', 'pmoore@email.com', '555-0112', 'B-103', '2025-02-01', '2026-02-01', 'Frank Moore - 555-0212', true, 'Lease expired, pending renewal'),
      ('Daniel', 'Jackson', 'djackson@email.com', '555-0113', 'B-202', '2026-02-01', '2027-02-01', 'Sue Jackson - 555-0213', true, 'New tenant, just moved in'),
      ('Michelle', 'Harris', 'mharris@email.com', '555-0114', 'C-103', '2025-06-15', '2026-06-15', 'Bob Harris - 555-0214', true, 'Home renovation, temporary storage'),
      ('Christopher', 'Clark', 'cclark@email.com', '555-0115', 'C-201', '2025-11-15', '2026-11-15', 'Jane Clark - 555-0215', true, 'Reserved unit, moving in next month'),
      ('Rachel', 'Lewis', 'rlewis@email.com', '555-0116', 'E-102', '2026-03-01', '2027-03-01', 'Tim Lewis - 555-0216', false, 'New tenant, vehicle storage')
    `);
    console.log('Tenants seeded (16 items).');

    // Seed Maintenance Requests (16 items)
    await pool.query(`
      INSERT INTO maintenance_requests (title, description, location, priority, status, assigned_to, requested_by, estimated_cost, completed_date) VALUES
      ('Broken door lock - Unit B-101', 'Lock mechanism jammed, tenant unable to access unit', 'Building B - Unit B-101', 'urgent', 'in_progress', 'Mike Tech', 'Robert Johnson', 150.00, NULL),
      ('HVAC filter replacement - Bldg A', 'Quarterly filter change due for all HVAC units in Building A', 'Building A - All Floors', 'medium', 'open', 'HVAC Team', 'John Manager', 450.00, NULL),
      ('Parking lot pothole repair', 'Large pothole near entrance causing vehicle damage complaints', 'Parking Lot - Main Entrance', 'high', 'open', NULL, 'Security Team', 1200.00, NULL),
      ('Lighting replacement - Hallway 3', 'Three fluorescent lights burned out in Building B hallway', 'Building B - Hallway 3', 'low', 'completed', 'Jake Maintenance', 'Jane Staff', 85.00, '2026-03-15'),
      ('Water stain on ceiling - Unit A-103', 'Possible roof leak causing water damage above unit', 'Building A - Floor 1', 'high', 'in_progress', 'Roofing Contractor', 'Sarah Williams', 2500.00, NULL),
      ('Gate motor replacement - Gate B', 'Gate motor grinding, intermittent failure to open/close', 'Gate B - Side Entrance', 'urgent', 'open', 'Gate Systems Inc', 'Maintenance', 800.00, NULL),
      ('Pest control - Building C', 'Mouse droppings found in hallway, tenant complaint', 'Building C - Floor 1', 'high', 'completed', 'ABC Pest Control', 'Lisa Anderson', 350.00, '2026-03-12'),
      ('Paint touch-up - Exterior south wall', 'Graffiti removal and repaint needed', 'Exterior - South Wall', 'low', 'open', NULL, 'Security Team', 400.00, NULL),
      ('Elevator maintenance - Building B', 'Annual elevator inspection and maintenance due', 'Building B - Elevator', 'medium', 'scheduled', 'Elevator Co', 'John Manager', 1500.00, NULL),
      ('Security camera replacement - CAM-15', 'Camera failed, needs full replacement', 'Parking Lot East', 'high', 'in_progress', 'Security Systems', 'Tech Support', 650.00, NULL),
      ('Drain cleaning - Loading dock', 'Floor drain clogged, water pooling during rain', 'Loading Dock', 'medium', 'completed', 'Plumbing Pro', 'Maintenance', 275.00, '2026-03-10'),
      ('Keypad replacement - Gate A', 'Keypad buttons worn, several numbers unresponsive', 'Gate A - Main Entrance', 'medium', 'open', NULL, 'Multiple Tenants', 320.00, NULL),
      ('Fire extinguisher inspection', 'Annual inspection due for all fire extinguishers', 'All Buildings', 'medium', 'open', 'Fire Safety Inc', 'John Manager', 200.00, NULL),
      ('AC unit repair - Wine Vault', 'Temperature fluctuating beyond acceptable range', 'Wine Storage Vault', 'urgent', 'in_progress', 'Climate Control Experts', 'Thomas Brown', 950.00, NULL),
      ('Fence repair - Northeast section', 'Fence cut detected, needs welding and reinforcement', 'Perimeter - Northeast', 'urgent', 'open', 'Fencing Co', 'Security Team', 1100.00, NULL),
      ('Roll-up door track - Unit D-103', 'Door track bent, door not sealing properly', 'Building D - Unit D-103', 'medium', 'completed', 'Door Systems', 'Maintenance', 425.00, '2026-03-08')
    `);
    console.log('Maintenance requests seeded (16 items).');

    // Seed Access Logs (18 items)
    await pool.query(`
      INSERT INTO access_logs (tenant_name, unit_number, access_type, access_method, access_time, granted, denied_reason) VALUES
      ('Michael Chen', 'A-101', 'gate_entry', 'keypad', '2026-03-20 08:15:00', true, NULL),
      ('Michael Chen', 'A-101', 'unit_open', 'keypad', '2026-03-20 08:18:00', true, NULL),
      ('Sarah Williams', 'A-103', 'gate_entry', 'app', '2026-03-20 09:30:00', true, NULL),
      ('Unknown', 'B-101', 'gate_entry', 'keypad', '2026-03-20 02:30:00', false, 'Expired access code'),
      ('Robert Johnson', 'B-101', 'gate_entry', 'card', '2026-03-19 14:00:00', true, NULL),
      ('Robert Johnson', 'B-101', 'unit_open', 'keypad', '2026-03-19 14:05:00', true, NULL),
      ('Emily Davis', 'B-102', 'gate_entry', 'app', '2026-03-19 10:00:00', true, NULL),
      ('James Wilson', 'B-201', 'gate_entry', 'keypad', '2026-03-19 23:00:00', true, NULL),
      ('Lisa Anderson', 'C-101', 'gate_entry', 'card', '2026-03-19 16:30:00', true, NULL),
      ('Lisa Anderson', 'C-101', 'unit_open', 'card', '2026-03-19 16:33:00', true, NULL),
      ('Lisa Anderson', 'C-101', 'unit_close', 'card', '2026-03-19 17:45:00', true, NULL),
      ('Lisa Anderson', 'C-101', 'gate_exit', 'card', '2026-03-19 17:48:00', true, NULL),
      ('David Martinez', 'C-102', 'gate_entry', 'app', '2026-03-18 11:00:00', true, NULL),
      ('Unknown', 'D-101', 'gate_entry', 'manual', '2026-03-18 03:45:00', false, 'Unregistered badge'),
      ('Thomas Brown', 'D-102', 'gate_entry', 'keypad', '2026-03-18 15:00:00', true, NULL),
      ('Amanda White', 'E-101', 'gate_entry', 'app', '2026-03-17 09:00:00', true, NULL),
      ('Kevin Garcia', 'A-201', 'gate_entry', 'keypad', '2026-03-17 13:30:00', true, NULL),
      ('Unknown', 'C-103', 'unit_open', 'manual', '2026-03-16 01:15:00', false, 'Non-tenant badge detected')
    `);
    console.log('Access logs seeded (18 items).');

    // Seed Insurance Policies (16 items)
    await pool.query(`
      INSERT INTO insurance_policies (tenant_name, unit_number, provider, policy_number, coverage_amount, monthly_premium, start_date, end_date, status, coverage_type) VALUES
      ('Michael Chen', 'A-101', 'StorageSafe Insurance', 'SS-2025-1001', 5000.00, 12.99, '2025-06-01', '2026-06-01', 'active', 'basic'),
      ('Sarah Williams', 'A-103', 'StorageSafe Insurance', 'SS-2025-1002', 15000.00, 29.99, '2025-09-15', '2026-09-15', 'active', 'premium'),
      ('Robert Johnson', 'B-101', 'SecureStore Coverage', 'SC-2025-2001', 10000.00, 19.99, '2025-03-01', '2026-03-01', 'expired', 'standard'),
      ('Emily Davis', 'B-102', 'StorageSafe Insurance', 'SS-2025-1003', 25000.00, 39.99, '2025-11-01', '2026-11-01', 'active', 'business'),
      ('James Wilson', 'B-201', 'SecureStore Coverage', 'SC-2025-2002', 10000.00, 19.99, '2025-07-15', '2026-07-15', 'active', 'standard'),
      ('Lisa Anderson', 'C-101', 'Guardian Storage Plans', 'GP-2025-3001', 50000.00, 59.99, '2025-04-01', '2026-04-01', 'active', 'commercial'),
      ('David Martinez', 'C-102', 'Guardian Storage Plans', 'GP-2025-3002', 100000.00, 89.99, '2025-08-01', '2026-08-01', 'active', 'fine_art'),
      ('Jennifer Taylor', 'D-101', 'StorageSafe Insurance', 'SS-2025-1004', 30000.00, 44.99, '2025-10-01', '2026-10-01', 'active', 'business'),
      ('Thomas Brown', 'D-102', 'Guardian Storage Plans', 'GP-2025-3003', 75000.00, 79.99, '2025-05-01', '2026-05-01', 'active', 'wine_collection'),
      ('Amanda White', 'E-101', 'AutoVault Insurance', 'AV-2025-4001', 45000.00, 54.99, '2025-12-01', '2026-12-01', 'active', 'vehicle'),
      ('Kevin Garcia', 'A-201', 'StorageSafe Insurance', 'SS-2026-1005', 3000.00, 9.99, '2026-01-15', '2027-01-15', 'active', 'basic'),
      ('Patricia Moore', 'B-103', 'SecureStore Coverage', 'SC-2025-2003', 10000.00, 19.99, '2025-02-01', '2026-02-01', 'expired', 'standard'),
      ('Daniel Jackson', 'B-202', 'StorageSafe Insurance', 'SS-2026-1006', 8000.00, 15.99, '2026-02-01', '2027-02-01', 'active', 'standard'),
      ('Michelle Harris', 'C-103', 'SecureStore Coverage', 'SC-2025-2004', 20000.00, 34.99, '2025-06-15', '2026-06-15', 'active', 'premium'),
      ('Christopher Clark', 'C-201', 'Guardian Storage Plans', 'GP-2025-3004', 15000.00, 29.99, '2025-11-15', '2026-11-15', 'active', 'premium'),
      ('Rachel Lewis', 'E-102', 'AutoVault Insurance', 'AV-2026-4002', 35000.00, 49.99, '2026-03-01', '2027-03-01', 'active', 'vehicle')
    `);
    console.log('Insurance policies seeded (16 items).');

    // Seed Move Activities (16 items)
    await pool.query(`
      INSERT INTO move_activities (tenant_name, unit_number, activity_type, scheduled_date, completed_date, status, requires_elevator, special_instructions, staff_assigned) VALUES
      ('Daniel Jackson', 'B-202', 'move_in', '2026-02-01', '2026-02-01', 'completed', true, 'Large furniture items, needs freight elevator', 'Jake Maintenance'),
      ('Rachel Lewis', 'E-102', 'move_in', '2026-03-01', '2026-03-01', 'completed', false, 'Classic motorcycle, needs ramp', 'Mike Tech'),
      ('Kevin Garcia', 'A-201', 'move_in', '2026-01-15', '2026-01-15', 'completed', false, 'College student, minimal items', NULL),
      ('Patricia Moore', 'B-103', 'move_out', '2026-03-25', NULL, 'scheduled', false, 'Lease expired, clearing unit', 'Jane Staff'),
      ('Robert Johnson', 'B-101', 'move_out', '2026-03-28', NULL, 'scheduled', false, 'Lease expiring, not renewing', NULL),
      ('Michelle Harris', 'C-103', 'move_out', '2026-04-15', NULL, 'scheduled', true, 'Home renovation complete, moving items back home', 'Jake Maintenance'),
      ('New Tenant TBD', 'A-102', 'move_in', '2026-03-22', NULL, 'scheduled', false, 'Small unit, new tenant onboarding', 'Jane Staff'),
      ('New Tenant TBD', 'B-202', 'move_in', '2026-04-01', NULL, 'scheduled', true, 'Business inventory, multiple trips expected', NULL),
      ('Lisa Anderson', 'C-101', 'move_out', '2026-04-30', NULL, 'scheduled', true, 'Corporate relocation, professional movers booked', 'Mike Tech'),
      ('Sarah Williams', 'A-103', 'move_out', '2026-05-01', NULL, 'scheduled', false, 'Antiques, needs careful handling', 'Jake Maintenance'),
      ('Michael Chen', 'A-101', 'move_in', '2025-06-01', '2025-06-01', 'completed', false, 'Small personal items', NULL),
      ('Emily Davis', 'B-102', 'move_in', '2025-11-01', '2025-11-01', 'completed', true, 'Business inventory, heavy boxes', 'Mike Tech'),
      ('Thomas Brown', 'D-102', 'move_in', '2025-05-01', '2025-05-01', 'completed', false, 'Wine collection, temperature sensitive', 'Jake Maintenance'),
      ('Amanda White', 'E-101', 'move_in', '2025-12-01', '2025-12-01', 'completed', false, '1967 Mustang, needs wide bay', NULL),
      ('Christopher Clark', 'C-201', 'move_in', '2026-04-01', NULL, 'scheduled', true, 'Reserved unit, will need elevator access', 'Jane Staff'),
      ('New Tenant TBD', 'D-103', 'move_in', '2026-04-10', NULL, 'scheduled', false, 'Extra-large unit, commercial use', NULL)
    `);
    console.log('Move activities seeded (16 items).');

    // Seed Revenue Records (18 items)
    await pool.query(`
      INSERT INTO revenue_records (category, amount, description, transaction_date, payment_method, tenant_name, unit_number, period_month, period_year) VALUES
      ('rent', 49.99, 'Monthly rent - Unit A-101', '2026-03-01', 'credit_card', 'Michael Chen', 'A-101', 3, 2026),
      ('rent', 79.99, 'Monthly rent - Unit A-103', '2026-03-01', 'bank_transfer', 'Sarah Williams', 'A-103', 3, 2026),
      ('rent', 99.99, 'Monthly rent - Unit B-101', '2026-03-05', 'credit_card', 'Robert Johnson', 'B-101', 3, 2026),
      ('rent', 129.99, 'Monthly rent - Unit B-102', '2026-03-01', 'credit_card', 'Emily Davis', 'B-102', 3, 2026),
      ('rent', 179.99, 'Monthly rent - Unit C-101', '2026-03-01', 'bank_transfer', 'Lisa Anderson', 'C-101', 3, 2026),
      ('rent', 219.99, 'Monthly rent - Unit C-102', '2026-03-01', 'credit_card', 'David Martinez', 'C-102', 3, 2026),
      ('rent', 269.99, 'Monthly rent - Unit D-101', '2026-03-03', 'credit_card', 'Jennifer Taylor', 'D-101', 3, 2026),
      ('rent', 319.99, 'Monthly rent - Unit D-102', '2026-03-01', 'bank_transfer', 'Thomas Brown', 'D-102', 3, 2026),
      ('rent', 149.99, 'Monthly rent - Unit E-101', '2026-03-02', 'credit_card', 'Amanda White', 'E-101', 3, 2026),
      ('insurance', 29.99, 'Insurance premium - Premium plan', '2026-03-01', 'credit_card', 'Sarah Williams', 'A-103', 3, 2026),
      ('insurance', 89.99, 'Insurance premium - Fine art plan', '2026-03-01', 'credit_card', 'David Martinez', 'C-102', 3, 2026),
      ('insurance', 54.99, 'Insurance premium - Vehicle plan', '2026-03-01', 'credit_card', 'Amanda White', 'E-101', 3, 2026),
      ('late_fees', 25.00, 'Late payment fee - March rent', '2026-03-15', 'credit_card', 'Robert Johnson', 'B-101', 3, 2026),
      ('late_fees', 25.00, 'Late payment fee - March rent', '2026-03-15', 'paypal', 'James Wilson', 'B-201', 3, 2026),
      ('admin_fees', 50.00, 'Unit transfer fee', '2026-03-10', 'credit_card', 'Kevin Garcia', 'A-201', 3, 2026),
      ('admin_fees', 35.00, 'Lock replacement fee', '2026-03-08', 'cash', 'Patricia Moore', 'B-103', 3, 2026),
      ('merchandise', 15.99, 'Moving boxes (pack of 10)', '2026-03-05', 'credit_card', 'Daniel Jackson', 'B-202', 3, 2026),
      ('merchandise', 8.99, 'Packing tape (3 rolls)', '2026-03-05', 'credit_card', 'Daniel Jackson', 'B-202', 3, 2026)
    `);
    console.log('Revenue records seeded (18 items).');

    // Seed Promotions (8 items)
    await pool.query(`
      INSERT INTO promotions (name, description, discount_type, discount_value, unit_type, start_date, end_date, promo_code, max_uses, current_uses, is_active) VALUES
      ('Spring Move-In Special', 'Get 25% off your first month when you move in this spring', 'percentage', 25.00, 'all', '2026-03-01', '2026-05-31', 'SPRING25', 50, 12, true),
      ('Summer Storage Deal', 'First month free on any medium unit', 'free_month', 1, 'medium', '2026-06-01', '2026-08-31', 'SUMMER1FREE', 30, 0, true),
      ('Student Discount', '15% off small units for students with valid ID', 'percentage', 15.00, 'small', '2026-01-01', '2026-12-31', 'STUDENT15', 100, 8, true),
      ('Referral Reward', '$50 off next month for referring a new tenant', 'fixed', 50.00, 'all', '2026-01-01', '2026-12-31', 'REFER50', 0, 23, true),
      ('Business Bulk Deal', '20% off large and extra-large units for businesses', 'percentage', 20.00, 'large', '2026-01-01', '2026-06-30', 'BIZ20', 20, 5, true),
      ('Vehicle Winter Special', '$30 off vehicle storage during winter months', 'fixed', 30.00, 'vehicle', '2025-12-01', '2026-02-28', 'WINTER30', 15, 15, false),
      ('New Year New Storage', 'Ring in the new year with 10% off any unit', 'percentage', 10.00, 'all', '2026-01-01', '2026-01-31', 'NEWYEAR10', 40, 40, false),
      ('Climate Control Upgrade', 'Free upgrade to climate-controlled unit for 3 months', 'free_month', 3, 'all', '2026-04-01', '2026-06-30', 'CLIMATE3', 10, 0, true)
    `);
    console.log('Promotions seeded (8 items).');

    // Seed Waitlist (10 items)
    await pool.query(`
      INSERT INTO waitlist (first_name, last_name, email, phone, desired_unit_type, desired_size_sqft, climate_controlled, max_budget, notes, status, notified_date) VALUES
      ('Alex', 'Thompson', 'athompson@email.com', '555-0301', 'medium', 100, true, 130.00, 'Moving from out of state, needs climate control for electronics', 'waiting', NULL),
      ('Maria', 'Rodriguez', 'mrodriguez@email.com', '555-0302', 'large', 200, false, 200.00, 'Small business owner, needs storage for inventory', 'contacted', '2026-03-15'),
      ('Brian', 'Kim', 'bkim@email.com', '555-0303', 'small', 50, false, 60.00, 'College student, just needs basic storage for summer', 'waiting', NULL),
      ('Stephanie', 'Nguyen', 'snguyen@email.com', '555-0304', 'vehicle', 100, false, 175.00, 'Has a vintage motorcycle to store', 'offered', '2026-03-18'),
      ('Carlos', 'Hernandez', 'chernandez@email.com', '555-0305', 'extra-large', 300, false, 300.00, 'Construction company, seasonal equipment storage', 'waiting', NULL),
      ('Laura', 'Mitchell', 'lmitchell@email.com', '555-0306', 'small', 25, true, 80.00, 'Wine enthusiast, looking for climate-controlled small unit', 'contacted', '2026-03-10'),
      ('Greg', 'Foster', 'gfoster@email.com', '555-0307', 'medium', 100, false, 100.00, 'Downsizing home, needs temporary storage', 'converted', '2026-03-05'),
      ('Natalie', 'Park', 'npark@email.com', '555-0308', 'large', 200, true, 250.00, 'Art collector, requires climate control and security', 'waiting', NULL),
      ('Derek', 'Sullivan', 'dsullivan@email.com', '555-0309', 'medium', 100, false, 110.00, 'Relocating for work, temporary storage needed', 'cancelled', '2026-02-28'),
      ('Heather', 'Adams', 'hadams@email.com', '555-0310', 'small', 50, false, 55.00, 'Seasonal items only, flexible on timing', 'waiting', NULL)
    `);
    console.log('Waitlist seeded (10 items).');

    console.log('\n✅ All seed data inserted successfully!');
    console.log('Seed users created; credentials were supplied through the environment.');
  } catch (err) {
    console.error('Seed error:', err.message);
  } finally {
    await pool.end();
  }
}

seed();
