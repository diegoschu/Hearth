const { query } = require('../config/database');
const { parseMessage } = require('./parser.service');
const { createEvent, detectConflicts } = require('./calendar.service');

const AUTOPILOT_BLOCKED = new Set(['medical']);

async function processNewMessages() {
  const messagesResult = await query(
    `SELECT rm.*, s.name AS source_name, s.label AS source_label, s.type AS source_type
     FROM raw_messages rm
     LEFT JOIN sources s ON s.id = rm.source_id
     WHERE rm.processed = false
     ORDER BY rm.received_at ASC
     LIMIT 20`
  );
  const messages = messagesResult.rows;
  if (!messages?.length) return;

  for (const msg of messages) {
    try {
      const parsed = await parseMessage(msg.content, {
        sourceName: msg.source_name,
        sourceLabel: msg.source_label,
      });

      await query('UPDATE raw_messages SET processed = true WHERE id = $1', [msg.id]);
      if (!parsed.is_relevant) continue;

      const insertResult = await query(
        `INSERT INTO parsed_events
          (raw_message_id, family_id, event_name, date, time, end_time, location, notes, action_items, category, confidence, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,'pending')
         RETURNING *`,
        [
          msg.id,
          msg.family_id,
          parsed.event_name,
          parsed.date,
          parsed.time,
          parsed.end_time,
          parsed.location,
          parsed.notes,
          JSON.stringify(parsed.action_items || []),
          parsed.category,
          parsed.confidence,
        ]
      );

      const parsedEvent = insertResult.rows[0];
      if (!parsedEvent) continue;
      await applyAutonomy(parsedEvent);
    } catch (err) {
      console.error(`[Agent] Error processing message ${msg.id}:`, err.message);
      await query('UPDATE raw_messages SET processed = true WHERE id = $1', [msg.id]);
    }
  }
}

async function applyAutonomy(parsedEvent) {
  const familyMembersResult = await query('SELECT id FROM users WHERE family_id = $1 ORDER BY created_at ASC', [parsedEvent.family_id]);
  const familyMembers = familyMembersResult.rows;
  if (!familyMembers?.length) return;

  const userId = familyMembers[0].id;
  const settingResult = await query(
    'SELECT level FROM autonomy_settings WHERE user_id = $1 AND category = $2 LIMIT 1',
    [userId, parsedEvent.category]
  );

  const autonomyLevel = settingResult.rows[0]?.level || 2;
  const effectiveLevel = getEffectiveLevel(autonomyLevel, parsedEvent);

  if (effectiveLevel === 3 && Number(parsedEvent.confidence) >= 0.9) {
    await autoConfirmEvent(parsedEvent, userId);
  }
}

function getEffectiveLevel(userLevel, parsedEvent) {
  if (AUTOPILOT_BLOCKED.has(parsedEvent.category)) return Math.min(userLevel, 2);
  if (!parsedEvent.date) return Math.min(userLevel, 2);
  if (Number(parsedEvent.confidence) < 0.85) return Math.min(userLevel, 2);
  if (Number(parsedEvent.confidence) < 0.5) return 1;
  return userLevel;
}

async function autoConfirmEvent(parsedEvent, userId) {
  try {
    const startTime = parsedEvent.time ? `${parsedEvent.date}T${String(parsedEvent.time).slice(0, 5)}:00` : `${parsedEvent.date}T09:00:00`;
    const endTime = parsedEvent.end_time
      ? `${parsedEvent.date}T${String(parsedEvent.end_time).slice(0, 5)}:00`
      : new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString();

    const gcalEvent = await createEvent(userId, {
      title: parsedEvent.event_name || 'Family Event',
      startTime,
      endTime,
      location: parsedEvent.location,
      notes: parsedEvent.notes,
    });

    await query(
      `UPDATE parsed_events
       SET status = 'auto_confirmed', assigned_to = $1, google_event_id = $2, updated_at = NOW()
       WHERE id = $3`,
      [userId, gcalEvent.id, parsedEvent.id]
    );
  } catch (err) {
    console.error(`[Agent] Auto-confirm failed for ${parsedEvent.id}:`, err.message);
  }
}

async function generateDigest(familyId) {
  const today = new Date().toISOString().split('T')[0];
  const weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const pendingResult = await query('SELECT * FROM parsed_events WHERE family_id = $1 AND status = $2', [familyId, 'pending']);
  const todayEventsResult = await query(
    `SELECT ce.*, u.name AS user_name
     FROM calendar_events ce
     LEFT JOIN users u ON u.id = ce.user_id
     WHERE ce.family_id = $1
       AND ce.start_time >= $2::timestamptz
       AND ce.start_time <= $3::timestamptz
     ORDER BY ce.start_time`,
    [familyId, `${today}T00:00:00Z`, `${today}T23:59:59Z`]
  );
  const weekEventsResult = await query(
    `SELECT * FROM calendar_events
     WHERE family_id = $1
       AND start_time >= $2::timestamptz
       AND start_time <= $3::timestamptz`,
    [familyId, `${today}T00:00:00Z`, `${weekEnd}T23:59:59Z`]
  );
  const conflicts = await detectConflicts(familyId, today);

  return {
    date: today,
    pendingReview: pendingResult.rows?.length || 0,
    conflicts: conflicts?.length || 0,
    eventsToday: todayEventsResult.rows?.length || 0,
    eventsThisWeek: weekEventsResult.rows?.length || 0,
    upcomingDeadlines: (pendingResult.rows || []).filter((x) => !!x.date).slice(0, 5),
    suggestions: (conflicts || []).map((c) => c.suggestion),
  };
}

module.exports = { processNewMessages, applyAutonomy, generateDigest, getEffectiveLevel };
