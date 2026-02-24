const { Pool } = require('pg');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[Config] Missing required environment variable: ${name}`);
  }
  return value;
}

const hasSupabaseKeys = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

if (!hasDatabaseUrl) {
  throw new Error('[Config] Missing required environment variable: DATABASE_URL');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function query(text, params = []) {
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
  dbMode: hasSupabaseKeys ? 'supabase+postgres' : 'postgres',
};
