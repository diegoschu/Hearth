const { supabase } = require('../config/database');
const { parseMessage } = require('./parser.service');
const { createEvent, detectConflicts } = require('./calendar.service');

const AUTOPILOT_BLOCKED = new Set(['medical']);

async function processNewMessages() {
  const { data: messages, error } = await supabase
    .from('raw_messages')
    .select('*, sources(name, label, type)')
    .eq('processed', false)
    .order('received_at', { ascending: true })
    .limit(20);

  if (error || !messages?.length) return;

  for (const msg of messages) {
    try {
      const parsed = await parseMessage(msg.content, {
        sourceName: msg.sources?.name,
        sourceLabel: msg.sources?.label,
      });

      await supabase.from('raw_messages').update({ processed: true }).eq('id', msg.id);
      if (!parsed.is_relevant) continue;

      const { data: parsedEvent, error: insertError } = await supabase
        .from('parsed_events')
        .insert({
          raw_message_id: msg.id,
          family_id: msg.family_id,
          event_name: parsed.event_name,
          date: parsed.date,
          time: parsed.time,
          end_time: parsed.end_time,
          location: parsed.location,
          notes: parsed.notes,
          action_items: parsed.action_items,
          category: parsed.category,
          confidence: parsed.confidence,
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) continue;
      await applyAutonomy(parsedEvent);
    } catch (err) {
      console.error(`[Agent] Error processing message ${msg.id}:`, err.message);
      await supabase.from('raw_messages').update({ processed: true }).eq('id', msg.id);
    }
  }
}

async function applyAutonomy(parsedEvent) {
  const { data: familyMembers } = await supabase.from('users').select('id').eq('family_id', parsedEvent.family_id);
  if (!familyMembers?.length) return;

  const userId = familyMembers[0].id;
  const { data: setting } = await supabase
    .from('autonomy_settings')
    .select('level')
    .eq('user_id', userId)
    .eq('category', parsedEvent.category)
    .single();

  const autonomyLevel = setting?.level || 2;
  const effectiveLevel = getEffectiveLevel(autonomyLevel, parsedEvent);

  if (effectiveLevel === 3 && parsedEvent.confidence >= 0.9) {
    await autoConfirmEvent(parsedEvent, userId);
  }
}

function getEffectiveLevel(userLevel, parsedEvent) {
  if (AUTOPILOT_BLOCKED.has(parsedEvent.category)) return Math.min(userLevel, 2);
  if (!parsedEvent.date) return Math.min(userLevel, 2);
  if (parsedEvent.confidence < 0.85) return Math.min(userLevel, 2);
  if (parsedEvent.confidence < 0.5) return 1;
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

    await supabase.from('parsed_events').update({
      status: 'auto_confirmed',
      assigned_to: userId,
      google_event_id: gcalEvent.id,
      updated_at: new Date().toISOString(),
    }).eq('id', parsedEvent.id);
  } catch (err) {
    console.error(`[Agent] Auto-confirm failed for ${parsedEvent.id}:`, err.message);
  }
}

async function generateDigest(familyId) {
  const today = new Date().toISOString().split('T')[0];
  const weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: pending } = await supabase.from('parsed_events').select('*').eq('family_id', familyId).eq('status', 'pending');
  const { data: todayEvents } = await supabase.from('calendar_events').select('*, users(name)').eq('family_id', familyId)
    .gte('start_time', `${today}T00:00:00Z`).lte('start_time', `${today}T23:59:59Z`).order('start_time');
  const { data: weekEvents } = await supabase.from('calendar_events').select('*').eq('family_id', familyId)
    .gte('start_time', `${today}T00:00:00Z`).lte('start_time', `${weekEnd}T23:59:59Z`);
  const conflicts = await detectConflicts(familyId, today);

  return {
    date: today,
    pendingReview: pending?.length || 0,
    conflicts: conflicts?.length || 0,
    eventsToday: todayEvents?.length || 0,
    eventsThisWeek: weekEvents?.length || 0,
    upcomingDeadlines: (pending || []).filter((x) => !!x.date).slice(0, 5),
    suggestions: (conflicts || []).map((c) => c.suggestion),
  };
}

module.exports = { processNewMessages, applyAutonomy, generateDigest, getEffectiveLevel };
