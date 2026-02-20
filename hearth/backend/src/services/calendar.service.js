const { google } = require('googleapis');
const { getAuthenticatedClient } = require('../config/google');
const { supabase } = require('../config/database');

/**
 * Sync events from a user's Google Calendar to local database.
 */
async function syncCalendar(userId) {
  const { data: user } = await supabase
    .from('users')
    .select('google_tokens, family_id')
    .eq('id', userId)
    .single();

  if (!user?.google_tokens) throw new Error('No Google tokens for user');

  const authClient = getAuthenticatedClient(user.google_tokens);
  const calendar = google.calendar({ version: 'v3', auth: authClient });

  // Get events from next 30 days
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
    const startTime = event.start?.dateTime || event.start?.date;
    const endTime = event.end?.dateTime || event.end?.date;

    await supabase.from('calendar_events').upsert(
      {
        user_id: userId,
        family_id: user.family_id,
        google_event_id: event.id,
        title: event.summary || 'Untitled Event',
        start_time: startTime,
        end_time: endTime,
        location: event.location || null,
        description: event.description || null,
        calendar_id: 'primary',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,google_event_id' }
    );
  }

  console.log(`[Calendar] Synced ${events.length} events for user ${userId}`);
  return events.length;
}

/**
 * Create an event on Google Calendar.
 */
async function createEvent(userId, eventData) {
  const { data: user } = await supabase
    .from('users')
    .select('google_tokens, family_id')
    .eq('id', userId)
    .single();

  if (!user?.google_tokens) throw new Error('No Google tokens for user');

  const authClient = getAuthenticatedClient(user.google_tokens);
  const calendar = google.calendar({ version: 'v3', auth: authClient });

  const event = {
    summary: eventData.title,
    location: eventData.location || undefined,
    description: eventData.notes || undefined,
    start: {
      dateTime: eventData.startTime,
      timeZone: eventData.timeZone || 'America/New_York',
    },
    end: {
      dateTime: eventData.endTime || eventData.startTime,
      timeZone: eventData.timeZone || 'America/New_York',
    },
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    resource: event,
  });

  // Also store locally
  await supabase.from('calendar_events').insert({
    user_id: userId,
    family_id: user.family_id,
    google_event_id: response.data.id,
    title: event.summary,
    start_time: eventData.startTime,
    end_time: eventData.endTime,
    location: eventData.location,
    description: eventData.notes,
    calendar_id: 'primary',
  });

  console.log(`[Calendar] Created event: ${event.summary}`);
  return response.data;
}

/**
 * Get unified family calendar view.
 */
async function getUnifiedView(familyId, startDate, endDate) {
  const { data: events, error } = await supabase
    .from('calendar_events')
    .select('*, users(id, name, picture)')
    .eq('family_id', familyId)
    .gte('start_time', startDate)
    .lte('start_time', endDate)
    .order('start_time', { ascending: true });

  if (error) throw error;

  // Group events by date
  const grouped = {};
  for (const event of events) {
    const date = event.start_time.split('T')[0];
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(event);
  }

  return grouped;
}

/**
 * Detect scheduling conflicts for a family on a given date.
 */
async function detectConflicts(familyId, date) {
  const { data: events } = await supabase
    .from('calendar_events')
    .select('*, users(id, name)')
    .eq('family_id', familyId)
    .gte('start_time', `${date}T00:00:00Z`)
    .lte('start_time', `${date}T23:59:59Z`)
    .order('start_time', { ascending: true });

  const conflicts = [];

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i];
      const b = events[j];

      // Same user, overlapping times
      if (a.user_id === b.user_id) {
        const aEnd = new Date(a.end_time || a.start_time);
        const bStart = new Date(b.start_time);

        if (aEnd > bStart) {
          conflicts.push({
            eventA: a,
            eventB: b,
            user: a.users,
            suggestion: `${a.title} overlaps with ${b.title}`,
          });
        }
      }
    }
  }

  return conflicts;
}

module.exports = {
  syncCalendar,
  createEvent,
  getUnifiedView,
  detectConflicts,
};
