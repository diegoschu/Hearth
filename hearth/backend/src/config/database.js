const { Pool } = require('pg');
const { AppError } = require('../middleware/error.middleware');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[Config] Missing required environment variable: ${name}`);
  }
  return value;
}

const hasSupabaseKeys = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

const pool = hasDatabaseUrl ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;

async function query(text, params = []) {
  if (!pool) {
    throw new AppError('Database is not configured (DATABASE_URL missing)', 500, 'DB_NOT_CONFIGURED');
  }
  const result = await pool.query(text, params);
  return result;
}

async function healthcheckDb() {
  await query('select 1');
}

module.exports = {
  query,
  pool,
  healthcheckDb,
  requireEnv,
  isDbConfigured: hasDatabaseUrl,
  dbMode: hasSupabaseKeys ? 'supabase+postgres' : 'postgres',
};
