const { google } = require('googleapis');
const { getAuthenticatedClient } = require('../config/google');
const { supabase } = require('../config/database');

async function syncCalendar(userId) {
  const { data: user } = await supabase.from('users').select('google_tokens, family_id').eq('id', userId).single();
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

    await supabase.from('calendar_events').upsert({
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
    }, { onConflict: 'user_id,google_event_id' });
  }

  return events.length;
}

async function createEvent(userId, eventData) {
  const { data: user } = await supabase.from('users').select('google_tokens, family_id').eq('id', userId).single();
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

  await supabase.from('calendar_events').insert({
    user_id: userId,
    family_id: user.family_id,
    google_event_id: response.data.id,
    title: eventData.title,
    start_time: eventData.startTime,
    end_time: eventData.endTime,
    location: eventData.location,
    description: eventData.notes,
    calendar_id: 'primary',
  });

  return response.data;
}

async function getUnifiedView(familyId, startDate, endDate) {
  const { data: events, error } = await supabase
    .from('calendar_events')
    .select('*, users(id, name, picture)')
    .eq('family_id', familyId)
    .gte('start_time', `${startDate}T00:00:00Z`)
    .lte('start_time', `${endDate}T23:59:59Z`)
    .order('start_time', { ascending: true });

  if (error) throw error;

  const grouped = {};
  for (const event of events || []) {
    const date = event.start_time.split('T')[0];
    if (!grouped[date]) grouped[date] = { date, events: [] };
    grouped[date].events.push({
      id: event.id,
      title: event.title,
      start: event.start_time,
      end: event.end_time,
      owner: event.users,
      source: 'google_calendar',
      color: event.color || '#4A90D9',
      location: event.location,
    });
  }

  return Object.values(grouped);
}

async function detectConflicts(familyId, date) {
  const { data: events } = await supabase
    .from('calendar_events')
    .select('id, user_id, title, start_time, end_time')
    .eq('family_id', familyId)
    .gte('start_time', `${date}T00:00:00Z`)
    .lte('start_time', `${date}T23:59:59Z`)
    .order('start_time', { ascending: true });

  const conflicts = [];
  for (let i = 0; i < (events || []).length; i++) {
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
