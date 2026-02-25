const express = require('express');
const { query } = require('../config/database');
const { createEvent } = require('../services/calendar.service');
const { AppError } = require('../middleware/error.middleware');

const router = express.Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

router.get('/', async (req, res, next) => {
  try {
    if (!req.user.family_id) {
      return res.json({ items: [], total: 0, pendingCount: 0 });
    }

    const { status } = req.query;
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));
    const offset = Math.max(0, Number(req.query.offset || 0));

    const where = ['pe.family_id = $1'];
    const params = [req.user.family_id];

    if (status) {
      if (!['pending', 'confirmed', 'dismissed', 'auto_confirmed'].includes(status)) {
        throw new AppError('Invalid status filter', 400, 'INVALID_STATUS');
      }
      params.push(status);
      where.push(`pe.status = $${params.length}`);
    }

    params.push(limit);
    params.push(offset);

    const rowsResult = await query(
      `SELECT pe.*, rm.content AS raw_message_content, s.type AS source_type, s.name AS source_name, s.label AS source_label
       FROM parsed_events pe
       LEFT JOIN raw_messages rm ON rm.id = pe.raw_message_id
       LEFT JOIN sources s ON s.id = rm.source_id
       WHERE ${where.join(' AND ')}
       ORDER BY pe.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const countParams = [req.user.family_id];
    let countWhere = 'family_id = $1';
    if (status) {
      countParams.push(status);
      countWhere += ' AND status = $2';
    }

    const totalResult = await query(`SELECT COUNT(*)::int AS count FROM parsed_events WHERE ${countWhere}`, countParams);
    const pendingResult = await query(
      'SELECT COUNT(*)::int AS count FROM parsed_events WHERE family_id = $1 AND status = $2',
      [req.user.family_id, 'pending']
    );

    const formatted = rowsResult.rows.map((item) => ({
      id: item.id,
      source: {
        type: item.source_type,
        name: item.source_name,
        label: item.source_label,
      },
      rawMessage: item.raw_message_content,
      parsed: {
        eventName: item.event_name,
        date: item.date,
        time: item.time,
        endTime: item.end_time,
        location: item.location,
        notes: item.notes,
        actionItems: item.action_items,
        category: item.category,
        confidence: parseFloat(item.confidence),
      },
      status: item.status,
      assignedTo: item.assigned_to,
      createdAt: item.created_at,
    }));

    res.json({
      items: formatted,
      total: totalResult.rows[0]?.count || 0,
      pendingCount: pendingResult.rows[0]?.count || 0,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/confirm', async (req, res, next) => {
  try {
    const { assignTo, adjustments } = req.body || {};

    const parsedResult = await query(
      'SELECT * FROM parsed_events WHERE id = $1 AND family_id = $2 LIMIT 1',
      [req.params.id, req.user.family_id]
    );
    const parsedEvent = parsedResult.rows[0];

    if (!parsedEvent) {
      throw new AppError('Event not found', 404, 'NOT_FOUND');
    }

    const eventDate = adjustments?.date || parsedEvent.date;
    if (!eventDate || !DATE_RE.test(String(eventDate))) {
      throw new AppError('Event date is required and must be YYYY-MM-DD', 400, 'INVALID_DATE');
    }

    const eventTime = adjustments?.time || (parsedEvent.time ? String(parsedEvent.time).slice(0, 5) : '09:00');
    if (!TIME_RE.test(String(eventTime))) {
      throw new AppError('Event time must be HH:MM', 400, 'INVALID_TIME');
    }

    const startTime = `${eventDate}T${eventTime}:00`;
    const endTime = parsedEvent.end_time
      ? `${eventDate}T${String(parsedEvent.end_time).slice(0, 5)}:00`
      : new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString();

    const targetUserId = assignTo || req.user.id;

    const gcalEvent = await createEvent(targetUserId, {
      title: parsedEvent.event_name || 'Family Event',
      startTime,
      endTime,
      location: parsedEvent.location,
      notes: parsedEvent.notes,
    });

    await query(
      `UPDATE parsed_events
       SET status = 'confirmed', assigned_to = $1, google_event_id = $2, updated_at = NOW()
       WHERE id = $3`,
      [targetUserId, gcalEvent.id, req.params.id]
    );

    res.json({ calendarEventId: gcalEvent.id, status: 'confirmed' });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/dismiss', async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE parsed_events
       SET status = 'dismissed', updated_at = NOW()
       WHERE id = $1 AND family_id = $2`,
      [req.params.id, req.user.family_id]
    );

    if (result.rowCount === 0) {
      throw new AppError('Event not found', 404, 'NOT_FOUND');
    }

    res.json({ status: 'dismissed' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
