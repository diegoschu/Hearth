require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function run() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required to run migrations.');
  }

  const schemaPath = path.join(__dirname, '..', 'models', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('hearth_schema_migration'))");
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ Migration complete: schema.sql applied successfully (idempotent).');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error('❌ Migration runner error:', error.message);
  process.exit(1);
});
