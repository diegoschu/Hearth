const express = require('express');
const { syncCalendar, getUnifiedView, detectConflicts } = require('../services/calendar.service');
const { AppError } = require('../middleware/error.middleware');

const router = express.Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/calendar — Get unified family calendar
router.get('/', async (req, res, next) => {
  try {
    if (!req.user.family_id) {
      return res.json({ days: [], conflicts: [] });
    }

    const { start, end } = req.query;

    const startDate = start || new Date().toISOString().split('T')[0];
    const endDate = end || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (!DATE_RE.test(String(startDate)) || !DATE_RE.test(String(endDate))) {
      throw new AppError('start and end must be YYYY-MM-DD', 400, 'INVALID_DATE_RANGE');
    }

    const events = await getUnifiedView(req.user.family_id, startDate, endDate);

    const allConflicts = [];
    for (const day of events) {
      const dayConflicts = await detectConflicts(req.user.family_id, day.date);
      if (dayConflicts.length) allConflicts.push(...dayConflicts);
    }

    res.json({ days: events, conflicts: allConflicts });
  } catch (err) {
    next(err);
  }
});

// POST /api/calendar/sync — Force re-sync from Google Calendar
router.post('/sync', async (req, res, next) => {
  try {
    if (!req.user.family_id) {
      throw new AppError('Join or create a family first', 400, 'FAMILY_REQUIRED');
    }

    const count = await syncCalendar(req.user.id);
    res.json({ synced: count, degraded: false, message: `Synced ${count} events` });
  } catch (err) {
    if (['GOOGLE_REAUTH_REQUIRED', 'GOOGLE_SCOPE_MISSING', 'GCAL_SYNC_FAILED'].includes(err.code)) {
      return res.status(200).json({
        synced: 0,
        degraded: true,
        error: { code: err.code, message: err.message },
      });
    }
    next(err);
  }
});

module.exports = router;
