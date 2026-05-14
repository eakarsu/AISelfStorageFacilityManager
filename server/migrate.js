const pool = require('./db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ai_results table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_results (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        endpoint VARCHAR(255),
        entity_id INTEGER,
        result JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // facilities table (multi-facility)
    await client.query(`
      CREATE TABLE IF NOT EXISTS facilities (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(50),
        phone VARCHAR(50),
        email VARCHAR(255),
        total_units INTEGER DEFAULT 0,
        manager_name VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // dunning_events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS dunning_events (
        id SERIAL PRIMARY KEY,
        billing_id INTEGER,
        dunning_stage VARCHAR(50),
        days_overdue INTEGER DEFAULT 0,
        amount DECIMAL(10,2),
        tenant_name VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Add facility_id to domain tables
    const domainTables = ['storage_units', 'pricing_rules', 'occupancy_forecasts', 'climate_controls', 'security_events'];
    for (const table of domainTables) {
      await client.query(`ALTER TABLE IF EXISTS ${table} ADD COLUMN IF NOT EXISTS facility_id INTEGER`).catch(() => {});
    }

    await client.query('COMMIT');
    console.log('Migration completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

migrate().catch(console.error).finally(() => pool.end());
