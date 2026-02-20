# Codex Instructions for Hearth

## What This Project Is
Hearth is a family household AI agent. It monitors WhatsApp chats and emails, parses them for family-relevant events (school events, pickups, appointments, activities), and manages a unified family calendar with smart conflict detection and task assignment.

## Priority Build Order

### Phase 1: Backend Foundation (START HERE)
1. Set up Express server with basic middleware (CORS, JSON parsing, error handling)
2. Set up PostgreSQL connection via Supabase client
3. Create database schema and run migrations
4. Implement Google OAuth flow (login with Google)
5. Implement JWT-based session management

### Phase 2: Google Calendar Integration
1. After OAuth, store Google Calendar refresh tokens
2. Implement calendar sync — pull events from user's Google Calendars
3. Implement write-back — create/update/delete events on Google Calendar
4. Build unified calendar merge logic (combine 2+ calendars, deduplicate)
5. Build conflict detection (overlapping events for same parent)

### Phase 3: WhatsApp Integration via RapidAPI
1. Integrate with RapidAPI WhatsApp API (see services/whatsapp.service.js)
2. Implement message polling for registered chat groups
3. Store raw messages in database with source metadata
4. Build message queue for processing pipeline

### Phase 4: AI Message Parsing
1. Send raw messages to Claude (Haiku) via Anthropic SDK with structured output
2. Extract: event name, date, time, location, notes, action items
3. Score confidence (0-1) based on parsing clarity
4. Store parsed results linked to source messages
5. Generate suggested actions per parsed message

### Phase 5: Agent Feed & Actions
1. Build feed API — return parsed messages with status (pending/confirmed/dismissed)
2. Implement confirm action — push parsed event to Google Calendar
3. Implement dismiss action — mark as not relevant
4. Implement assignment — tag event with parent owner

### Phase 6: Frontend
1. The React mockup already exists in frontend/src/App.jsx
2. Connect it to real API endpoints
3. Replace mock data with API calls
4. Add Google OAuth login flow
5. Add real-time updates (polling or WebSocket)

### Phase 7: Autonomy Engine
1. Store per-user, per-category autonomy settings
2. For "autopilot" categories: auto-confirm high-confidence parsed events
3. For "co-pilot" categories: surface for approval
4. For "dashboard" categories: display only, no action buttons

## Key Technical Decisions

### WhatsApp via RapidAPI
- Use the `maytapi` or `greenapi` WhatsApp providers on RapidAPI
- These provide REST APIs for reading messages from WhatsApp groups
- User registers specific group chat IDs to monitor
- Backend polls for new messages every 60 seconds
- Rate limit: respect RapidAPI tier limits

### Message Parsing Prompt
The Anthropic Claude call should use this system prompt structure:
```
You are a family calendar assistant. Parse the following message from a family-related chat group or email. Extract structured data.

Respond ONLY in JSON:
{
  "is_relevant": boolean,       // Is this about a schedulable event?
  "confidence": number,         // 0.0-1.0 how confident in parsing
  "event_name": string | null,
  "date": "YYYY-MM-DD" | null,
  "time": "HH:MM" | null,
  "end_time": "HH:MM" | null,
  "location": string | null,
  "notes": string | null,
  "action_items": string[],     // Things to do (buy supplies, set reminder, etc.)
  "category": "school" | "medical" | "extracurricular" | "social" | "household" | "other"
}

Today's date is: {current_date}
Source: {source_label} (e.g., "Lincoln Elementary Parents WhatsApp")
```

### Database Schema
See models/ directory for Prisma schema. Key tables:
- users (Google OAuth profile)
- families (groups users into households)
- sources (registered WhatsApp chats, email filters)
- raw_messages (ingested messages)
- parsed_events (AI-extracted events)
- calendar_events (synced from Google Cal)
- autonomy_settings (per-user, per-category levels)

### Conflict Detection Logic
```
For each new parsed event:
1. Get all calendar events for that date
2. Check time overlap with each existing event
3. If overlap found:
   a. Check if same parent is assigned to both
   b. If yes → flag as conflict
   c. Suggest: reassign to other parent, or flag for manual resolution
4. If no parent assigned yet:
   a. Check which parent is free at that time
   b. Suggest the available parent
   c. If both free, suggest based on historical pattern
```

## File-by-File Guidance

### backend/src/services/whatsapp.service.js
- Initialize RapidAPI client with API key
- `getMessages(chatId)` — fetch recent messages from a WhatsApp group
- `pollAllSources(userId)` — iterate registered sources, fetch new messages
- Store new messages, skip duplicates (check by message ID or content hash)

### backend/src/services/calendar.service.js
- Use googleapis npm package
- `syncCalendar(userId)` — pull events from Google Cal, upsert to local DB
- `createEvent(userId, eventData)` — push new event to Google Cal
- `getUnifiedView(familyId, dateRange)` — merge events from all family members
- `detectConflicts(familyId, date)` — find overlapping events

### backend/src/services/parser.service.js
- Use Anthropic Claude npm package
- `parseMessage(rawText, sourceContext)` — send to GPT, return structured event
- Validate response schema before storing
- If confidence < 0.5, mark as "needs_review"

### backend/src/services/agent.service.js
- `processNewMessages()` — orchestrator: poll → parse → check conflicts → route
- `applyAutonomy(parsedEvent, userSettings)` — decide action based on autonomy level
- `generateDigest(familyId)` — compile daily summary of pending items

## Testing Strategy
- Unit tests for parser output validation
- Integration tests for Google Calendar CRUD
- Mock RapidAPI responses for WhatsApp tests
- Test conflict detection with overlapping event fixtures

## Important Notes
- All times should be stored in UTC, converted to user's timezone on display
- WhatsApp message polling should be idempotent (don't re-process same message)
- Google OAuth tokens need refresh logic — access tokens expire after 1 hour
- Rate limit Anthropic Claude calls — batch messages where possible
- The frontend mockup in App.jsx has the full UI spec — match it exactly when connecting to real data
