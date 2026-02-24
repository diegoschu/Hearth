const express = require('express');
const { query } = require('../config/database');
const { createEvent } = require('../services/calendar.service');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { status } = req.query;
    const limit = Number(req.query.limit || 20);
    const offset = Number(req.query.offset || 0);

    const where = ['pe.family_id = $1'];
    const params = [req.user.family_id];

    if (status) {
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
      countWhere += ` AND status = $2`;
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
    const { assignTo, adjustments } = req.body;

    const parsedResult = await query(
      'SELECT * FROM parsed_events WHERE id = $1 AND family_id = $2 LIMIT 1',
      [req.params.id, req.user.family_id]
    );
    const parsedEvent = parsedResult.rows[0];

    if (!parsedEvent) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Event not found' } });
    }

    const eventDate = adjustments?.date || parsedEvent.date;
    const eventTime = adjustments?.time || (parsedEvent.time ? String(parsedEvent.time).slice(0, 5) : '09:00');

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
    await query(
      `UPDATE parsed_events
       SET status = 'dismissed', updated_at = NOW()
       WHERE id = $1 AND family_id = $2`,
      [req.params.id, req.user.family_id]
    );

    res.json({ status: 'dismissed' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
