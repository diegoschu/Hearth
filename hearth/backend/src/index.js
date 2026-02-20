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

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());

// Public routes
app.use('/auth', authRoutes);

// Protected routes
app.use('/api/family', authMiddleware, familyRoutes);
app.use('/api/sources', authMiddleware, sourceRoutes);
app.use('/api/feed', authMiddleware, feedRoutes);
app.use('/api/calendar', authMiddleware, calendarRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);
app.use('/api/digest', authMiddleware, digestRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Cron Jobs
// Poll WhatsApp sources every 60 seconds
cron.schedule('* * * * *', async () => {
  try {
    console.log('[CRON] Polling WhatsApp sources...');
    await pollAllSources();
    await processNewMessages();
  } catch (err) {
    console.error('[CRON] Polling error:', err.message);
  }
});

// Generate daily digest at 7:00 AM
cron.schedule('0 7 * * *', async () => {
  try {
    console.log('[CRON] Generating daily digests...');
    // TODO: Generate and send digest for each family
  } catch (err) {
    console.error('[CRON] Digest error:', err.message);
  }
});

app.listen(PORT, () => {
  console.log(`🏠 Hearth backend running on port ${PORT}`);
});

module.exports = app;
