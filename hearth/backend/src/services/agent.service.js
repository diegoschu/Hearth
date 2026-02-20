const { supabase } = require('../config/database');
const { parseMessage } = require('./parser.service');
const { createEvent, detectConflicts } = require('./calendar.service');

/**
 * Process all unprocessed raw messages:
 * 1. Fetch unprocessed messages
 * 2. Parse each with AI
 * 3. Store parsed events
 * 4. Apply autonomy rules
 * 5. Auto-confirm if applicable
 */
async function processNewMessages() {
  // Get unprocessed messages with source info
  const { data: messages, error } = await supabase
    .from('raw_messages')
    .select('*, sources(name, label, type)')
    .eq('processed', false)
    .order('received_at', { ascending: true })
    .limit(20); // Process in batches

  if (error || !messages?.length) return;

  console.log(`[Agent] Processing ${messages.length} new messages`);

  for (const msg of messages) {
    try {
      // Parse with AI
      const parsed = await parseMessage(msg.content, {
        sourceName: msg.sources?.name,
        sourceLabel: msg.sources?.label,
      });

      // Mark as processed
      await supabase
        .from('raw_messages')
        .update({ processed: true })
        .eq('id', msg.id);

      // Skip irrelevant messages
      if (!parsed.is_relevant) continue;

      // Store parsed event
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

      if (insertError) {
        console.error('[Agent] Failed to store parsed event:', insertError.message);
        continue;
      }

      // Apply autonomy rules
      await applyAutonomy(parsedEvent);
    } catch (err) {
      console.error(`[Agent] Error processing message ${msg.id}:`, err.message);
      // Mark as processed to avoid infinite retry
      await supabase
        .from('raw_messages')
        .update({ processed: true })
        .eq('id', msg.id);
    }
  }
}

/**
 * Apply autonomy settings to determine what action to take.
 */
async function applyAutonomy(parsedEvent) {
  // Get all family members' autonomy settings for this category
  const { data: familyMembers } = await supabase
    .from('users')
    .select('id')
    .eq('family_id', parsedEvent.family_id);

  if (!familyMembers?.length) return;

  // Check the "primary" user's autonomy setting (first family member for now)
  // TODO: More sophisticated per-user logic
  const userId = familyMembers[0].id;

  const { data: setting } = await supabase
    .from('autonomy_settings')
    .select('level')
    .eq('user_id', userId)
    .eq('category', parsedEvent.category)
    .single();

  const autonomyLevel = setting?.level || 2; // Default to co-pilot

  // Override rules (see AGENT_LOGIC.md)
  const effectiveLevel = getEffectiveLevel(autonomyLevel, parsedEvent);

  if (effectiveLevel === 3 && parsedEvent.confidence >= 0.85) {
    // AUTOPILOT: Auto-confirm and push to calendar
    await autoConfirmEvent(parsedEvent, userId);
  }
  // Levels 1 & 2: Leave as pending for user to review in feed
}

/**
 * Determine effective autonomy level considering confidence and safety overrides.
 */
function getEffectiveLevel(userLevel, parsedEvent) {
  // Medical: always co-pilot minimum
  if (parsedEvent.category === 'medical') return Math.min(userLevel, 2);

  // Low confidence: always co-pilot minimum
  if (parsedEvent.confidence < 0.8) return Math.min(userLevel, 2);

  // Very low confidence: always dashboard
  if (parsedEvent.confidence < 0.5) return 1;

  return userLevel;
}

/**
 * Auto-confirm a parsed event: push to Google Calendar.
 */
async function autoConfirmEvent(parsedEvent, userId) {
  try {
    if (!parsedEvent.date) return;

    const startTime = parsedEvent.time
      ? `${parsedEvent.date}T${parsedEvent.time}:00`
      : `${parsedEvent.date}T09:00:00`;

    const endTime = parsedEvent.end_time
      ? `${parsedEvent.date}T${parsedEvent.end_time}:00`
      : new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString();

    const gcalEvent = await createEvent(userId, {
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
        status: 'auto_confirmed',
        assigned_to: userId,
        google_event_id: gcalEvent.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parsedEvent.id);

    console.log(`[Agent] Auto-confirmed: ${parsedEvent.event_name}`);
  } catch (err) {
    console.error(`[Agent] Auto-confirm failed for ${parsedEvent.id}:`, err.message);
  }
}

/**
 * Generate daily digest for a family.
 */
async function generateDigest(familyId) {
  const today = new Date().toISOString().split('T')[0];
  const weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Pending items
  const { data: pending } = await supabase
    .from('parsed_events')
    .select('*')
    .eq('family_id', familyId)
    .eq('status', 'pending');

  // Today's events
  const { data: todayEvents } = await supabase
    .from('calendar_events')
    .select('*, users(name)')
    .eq('family_id', familyId)
    .gte('start_time', `${today}T00:00:00Z`)
    .lte('start_time', `${today}T23:59:59Z`)
    .order('start_time');

  // This week's events
  const { data: weekEvents } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('family_id', familyId)
    .gte('start_time', `${today}T00:00:00Z`)
    .lte('start_time', `${weekEnd}T23:59:59Z`);

  // Conflicts today
  const conflicts = await detectConflicts(familyId, today);

  return {
    date: today,
    pendingReview: pending?.length || 0,
    conflicts: conflicts?.length || 0,
    eventsToday: todayEvents?.length || 0,
    eventsThisWeek: weekEvents?.length || 0,
    todaySchedule: todayEvents || [],
    pendingItems: pending || [],
    conflictDetails: conflicts || [],
  };
}

module.exports = {
  processNewMessages,
  applyAutonomy,
  generateDigest,
};
