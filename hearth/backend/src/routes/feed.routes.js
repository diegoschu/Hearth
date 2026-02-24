const express = require('express');
const { supabase } = require('../config/database');
const { createEvent } = require('../services/calendar.service');

const router = express.Router();

// GET /api/feed — Get parsed events for review
router.get('/', async (req, res, next) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;

    let query = supabase
      .from('parsed_events')
      .select('*, raw_messages(content, sources(name, type, label))', { count: 'exact' })
      .eq('family_id', req.user.family_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: items, error, count } = await query;
    if (error) throw error;

    // Count pending
    const { count: pendingCount } = await supabase
      .from('parsed_events')
      .select('*', { count: 'exact', head: true })
      .eq('family_id', req.user.family_id)
      .eq('status', 'pending');

    // Format response
    const formatted = (items || []).map((item) => ({
      id: item.id,
      source: {
        type: item.raw_messages?.sources?.type,
        name: item.raw_messages?.sources?.name,
        label: item.raw_messages?.sources?.label,
      },
      rawMessage: item.raw_messages?.content,
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

    res.json({ items: formatted, total: count, pendingCount });
  } catch (err) {
    next(err);
  }
});

// POST /api/feed/:id/confirm — Confirm a parsed event, push to Google Calendar
router.post('/:id/confirm', async (req, res, next) => {
  try {
    const { assignTo, adjustments } = req.body;

    const { data: parsedEvent } = await supabase
      .from('parsed_events')
      .select('*')
      .eq('id', req.params.id)
      .eq('family_id', req.user.family_id)
      .single();

    if (!parsedEvent) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Event not found' } });
    }

    // Apply adjustments if provided
    const eventDate = adjustments?.date || parsedEvent.date;
    const eventTime = adjustments?.time || (parsedEvent.time ? String(parsedEvent.time).slice(0, 5) : '09:00');

    const startTime = `${eventDate}T${eventTime}:00`;
    const endTime = parsedEvent.end_time
      ? `${eventDate}T${String(parsedEvent.end_time).slice(0, 5)}:00`
      : new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString();

    const targetUserId = assignTo || req.user.id;

    // Create Google Calendar event
    const gcalEvent = await createEvent(targetUserId, {
      title: parsedEvent.event_name || 'Family Event',
      startTime,
      endTime,
      location: parsedEvent.location,
      notes: parsedEvent.notes,
    });

    // Update parsed event status
    await supabase
      .from('parsed_events')
      .update({
        status: 'confirmed',
        assigned_to: targetUserId,
        google_event_id: gcalEvent.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id);

    res.json({ calendarEventId: gcalEvent.id, status: 'confirmed' });
  } catch (err) {
    next(err);
  }
});

// POST /api/feed/:id/dismiss — Dismiss a parsed event
router.post('/:id/dismiss', async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('parsed_events')
      .update({ status: 'dismissed', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('family_id', req.user.family_id);

    if (error) throw error;
    res.json({ status: 'dismissed' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
