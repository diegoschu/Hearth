require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

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
const fs = require('fs');
const path = require('path');
const { requireEnv, healthcheckDb, dbMode, pool } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3001;
const startedAt = Date.now();

try {
  requireEnv('JWT_SECRET');
  requireEnv('FRONTEND_URL');
  requireEnv('DATABASE_URL');
} catch (error) {
  console.error('[Startup] Missing required env:', error.message);
  console.error('[Startup] Copy backend/.env.example to backend/.env and fill required values.');
  process.exit(1);
}

console.log(`[Startup] Hearth backend booting (dbMode=${dbMode}, nodeEnv=${process.env.NODE_ENV || 'development'})`);

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
    res.json({ status: 'ok', uptimeSec: Math.round((Date.now() - startedAt) / 1000), timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'degraded', error: error.message, timestamp: new Date().toISOString() });
  }
});

app.get('/ready', async (req, res) => {
  try {
    await healthcheckDb();
    res.json({ ready: true, db: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ ready: false, db: 'error', error: error.message, timestamp: new Date().toISOString() });
  }
});

app.use(errorHandler);

const pollerEnabled = process.env.ENABLE_POLLER === 'true';
if (pollerEnabled) {
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
} else {
  console.log('[CRON] Poller disabled (set ENABLE_POLLER=true to enable).');
}

async function maybeAutoMigrate() {
  const enabled = (process.env.AUTO_MIGRATE || 'true') === 'true';
  if (!enabled) return;

  const schemaPath = path.join(__dirname, 'models', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
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
    await healthcheckDb();
    console.log('[Startup] Database connectivity check passed.');
    await maybeAutoMigrate();
  } catch (error) {
    console.error('[Startup] Database connectivity check failed:', error.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🏠 Hearth backend running on port ${PORT}`);
  });
}

start();

module.exports = app;
