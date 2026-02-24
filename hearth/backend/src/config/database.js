const { createClient } = require('@supabase/supabase-js');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[Config] Missing required environment variable: ${name}`);
  }
  return value;
}

function createSupabaseClient() {
  const url = requireEnv('SUPABASE_URL');
  const serviceKey = requireEnv('SUPABASE_SERVICE_KEY');

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

const supabase = createSupabaseClient();

module.exports = { supabase, requireEnv };
