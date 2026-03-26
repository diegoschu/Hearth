require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const familyRoutes = require('./routes/family.routes');
const sourceRoutes = require('./routes/source.routes');
const feedRoutes = require('./routes/feed.routes');
const calendarRoutes = require('./routes/calendar.routes');
const settingsRoutes = require('./routes/settings.routes');
const digestRoutes = require('./routes/digest.routes');

const { authMiddleware } = require('./middleware/auth.middleware');
const { errorHandler } = require('./middleware/error.middleware');
const { pollAllSources } = require('./services/whatsapp.service');
const { processNewMessages } = require('./services/agent.service');
const { requireEnv, healthcheckDb, dbMode, pool, isDbConfigured, query } = require('./config/database');

const PORT = process.env.PORT || 3001;

function validateStartupEnv() {
  requireEnv('JWT_SECRET');
  requireEnv('FRONTEND_URL');
  // DATABASE_URL is optional — server runs in demo mode without it
  if (!process.env.DATABASE_URL) {
    console.warn('[Startup] DATABASE_URL not set — running in demo mode (no persistence)');
  }
}

function createApp() {
  const app = express();
  const startedAt = Date.now();

  app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
  app.use(express.json());

  app.use('/auth', authRoutes);

  app.use('/api/family', authMiddleware, familyRoutes);
  app.use('/api/sources', authMiddleware, sourceRoutes);
  app.use('/api/feed', authMiddleware, feedRoutes);
  app.use('/api/calendar', authMiddleware, calendarRoutes);
  app.use('/api/settings', authMiddleware, settingsRoutes);
  app.use('/api/digest', authMiddleware, digestRoutes);

  app.get('/health', async (req, res) => {
    try {
      await healthcheckDb();
      res.json({
        status: 'ok',
        db: 'ok',
        dbConfigured: isDbConfigured,
        uptimeSec: Math.round((Date.now() - startedAt) / 1000),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(503).json({
        status: 'degraded',
        db: 'error',
        dbConfigured: isDbConfigured,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.get('/ready', async (req, res) => {
    try {
      await healthcheckDb();
      res.json({
        ready: true,
        checks: { db: 'ok', env: 'ok' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(503).json({
        ready: false,
        checks: { db: 'error', env: 'ok' },
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.use(errorHandler);
  return app;
}

function setupCronJobs() {
  const pollerEnabled = process.env.ENABLE_POLLER === 'true';
  if (!pollerEnabled) {
    console.log('[CRON] Poller disabled (set ENABLE_POLLER=true to enable).');
    return;
  }

  cron.schedule('* * * * *', async () => {
    try {
      console.log('[CRON] Polling WhatsApp sources...');
      await pollAllSources();
      await processNewMessages();
    } catch (err) {
      console.error('[CRON] Polling error:', err.message);
    }
  });

  cron.schedule('0 7 * * *', async () => {
    try {
      console.log('[CRON] Generating daily digests...');
    } catch (err) {
      console.error('[CRON] Digest error:', err.message);
    }
  });
}

async function maybeAutoMigrate() {
  const enabled = (process.env.AUTO_MIGRATE || 'true') === 'true';
  if (!enabled) return;
  if (!pool) throw new Error('Cannot auto-migrate because DATABASE_URL is not configured');

  const schemaPath = path.join(__dirname, 'models', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('hearth_schema_migration'))");
    await client.query(sql);
    await client.query('COMMIT');
    console.log('[Startup] Auto-migrate applied successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Startup] Auto-migrate failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function start() {
  try {
    validateStartupEnv();
  } catch (error) {
    console.error('[Startup] Missing required env:', error.message);
    console.error('[Startup] Copy backend/.env.example to backend/.env and fill required values.');
    process.exit(1);
  }

  console.log(`[Startup] Hearth backend booting (dbMode=${dbMode}, nodeEnv=${process.env.NODE_ENV || 'development'})`);

  try {
    await healthcheckDb();
    if (isDbConfigured) {
      console.log('[Startup] Database connectivity check passed.');
      await maybeAutoMigrate();
    }
  } catch (error) {
    console.error('[Startup] Database connectivity check failed:', error.message);
    if (isDbConfigured) {
      process.exit(1); // Only exit if DB was expected
    }
  }

  setupCronJobs();

  const app = createApp();
  app.listen(PORT, () => {
    console.log(`🏠 Hearth backend running on port ${PORT}`);
  });

  return app;
}

if (require.main === module) {
  start();
}

module.exports = { createApp, start, validateStartupEnv, maybeAutoMigrate };
