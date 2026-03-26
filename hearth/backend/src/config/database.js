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
const isDbConfigured = hasDatabaseUrl;

const pool = hasDatabaseUrl ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;

async function query(text, params = []) {
  if (!pool) {
    throw new AppError('Database is not configured (DATABASE_URL missing)', 500, 'DB_NOT_CONFIGURED');
  }
  const result = await pool.query(text, params);
  return result;
}

async function healthcheckDb() {
  if (!pool) {
    console.warn('[Health] Database not configured — running in demo mode');
    return; // succeed silently in demo mode
  }
  await query('select 1');
}

module.exports = {
  query,
  pool,
  healthcheckDb,
  requireEnv,
  isDbConfigured,
  dbMode: hasDatabaseUrl
    ? (hasSupabaseKeys ? 'supabase+postgres' : 'postgres')
    : 'demo',
};
