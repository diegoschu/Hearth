const express = require('express');
const { syncCalendar, getUnifiedView, detectConflicts } = require('../services/calendar.service');

const router = express.Router();

// GET /api/calendar — Get unified family calendar
router.get('/', async (req, res, next) => {
  try {
    const { start, end } = req.query;

    const startDate = start || new Date().toISOString().split('T')[0];
    const endDate = end || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const events = await getUnifiedView(req.user.family_id, startDate, endDate);

    // Check conflicts for each day
    const allConflicts = [];
    for (const date of Object.keys(events)) {
      const dayConflicts = await detectConflicts(req.user.family_id, date);
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
    const count = await syncCalendar(req.user.id);
    res.json({ synced: count, message: `Synced ${count} events` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
