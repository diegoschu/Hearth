const { google } = require('googleapis');
const { getAuthenticatedClient } = require('../config/google');
const { query } = require('../config/database');

async function syncCalendar(userId) {
  const userResult = await query('SELECT google_tokens, family_id FROM users WHERE id = $1 LIMIT 1', [userId]);
  const user = userResult.rows[0];
  if (!user?.google_tokens) throw new Error('No Google tokens for user');

  const authClient = getAuthenticatedClient(user.google_tokens, userId);
  const calendar = google.calendar({ version: 'v3', auth: authClient });

  const now = new Date();
  const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: now.toISOString(),
    timeMax: thirtyDaysOut.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 250,
  });

  const events = response.data.items || [];
  for (const event of events) {
    const startTime = event.start?.dateTime || `${event.start?.date}T00:00:00Z`;
    const endTime = event.end?.dateTime || `${event.end?.date}T00:00:00Z`;

    await query(
      `INSERT INTO calendar_events (
          user_id, family_id, google_event_id, title, start_time, end_time, location, description, calendar_id, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
        ON CONFLICT (user_id, google_event_id)
        DO UPDATE SET
          title = EXCLUDED.title,
          start_time = EXCLUDED.start_time,
          end_time = EXCLUDED.end_time,
          location = EXCLUDED.location,
          description = EXCLUDED.description,
          calendar_id = EXCLUDED.calendar_id,
          updated_at = NOW()`,
      [userId, user.family_id, event.id, event.summary || 'Untitled Event', startTime, endTime, event.location || null, event.description || null, 'primary']
    );
  }

  return events.length;
}

async function createEvent(userId, eventData) {
  const userResult = await query('SELECT google_tokens, family_id FROM users WHERE id = $1 LIMIT 1', [userId]);
  const user = userResult.rows[0];
  if (!user?.google_tokens) throw new Error('No Google tokens for user');

  const authClient = getAuthenticatedClient(user.google_tokens, userId);
  const calendar = google.calendar({ version: 'v3', auth: authClient });

  const response = await calendar.events.insert({
    calendarId: 'primary',
    resource: {
      summary: eventData.title,
      location: eventData.location || undefined,
      description: eventData.notes || undefined,
      start: { dateTime: eventData.startTime, timeZone: eventData.timeZone || 'America/New_York' },
      end: { dateTime: eventData.endTime || eventData.startTime, timeZone: eventData.timeZone || 'America/New_York' },
    },
  });

  await query(
    `INSERT INTO calendar_events
      (user_id, family_id, google_event_id, title, start_time, end_time, location, description, calendar_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [userId, user.family_id, response.data.id, eventData.title, eventData.startTime, eventData.endTime, eventData.location, eventData.notes, 'primary']
  );

  return response.data;
}

async function getUnifiedView(familyId, startDate, endDate) {
  const result = await query(
    `SELECT ce.*, u.id AS owner_id, u.name AS owner_name, u.picture AS owner_picture
     FROM calendar_events ce
     LEFT JOIN users u ON u.id = ce.user_id
     WHERE ce.family_id = $1
       AND ce.start_time >= $2::timestamptz
       AND ce.start_time <= $3::timestamptz
     ORDER BY ce.start_time ASC`,
    [familyId, `${startDate}T00:00:00Z`, `${endDate}T23:59:59Z`]
  );

  const grouped = {};
  for (const event of result.rows || []) {
    const date = event.start_time.toISOString().split('T')[0];
    if (!grouped[date]) grouped[date] = { date, events: [] };
    grouped[date].events.push({
      id: event.id,
      title: event.title,
      start: event.start_time,
      end: event.end_time,
      owner: { id: event.owner_id, name: event.owner_name, picture: event.owner_picture },
      source: 'google_calendar',
      color: event.color || '#4A90D9',
      location: event.location,
    });
  }

  return Object.values(grouped);
}

async function detectConflicts(familyId, date) {
  const result = await query(
    `SELECT id, user_id, title, start_time, end_time
     FROM calendar_events
     WHERE family_id = $1
       AND start_time >= $2::timestamptz
       AND start_time <= $3::timestamptz
     ORDER BY start_time ASC`,
    [familyId, `${date}T00:00:00Z`, `${date}T23:59:59Z`]
  );

  const events = result.rows || [];
  const conflicts = [];
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i];
      const b = events[j];
      if (a.user_id !== b.user_id) continue;
      if (new Date(a.end_time || a.start_time) > new Date(b.start_time)) {
        conflicts.push({ date, events: [a.id, b.id], suggestion: `${a.title} overlaps ${b.title}` });
      }
    }
  }
  return conflicts;
}

module.exports = { syncCalendar, createEvent, getUnifiedView, detectConflicts };
