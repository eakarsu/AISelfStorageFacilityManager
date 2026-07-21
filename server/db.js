const { Pool } = require('pg');
require('dotenv').config();
const { databaseUrl } = require('./config/security');

const pool = new Pool({
  connectionString: databaseUrl,
});

module.exports = pool;
