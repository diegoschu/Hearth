# Agent Logic & Decision Trees

## Message Processing Pipeline

```
Raw Message Received
        │
        ▼
┌─────────────────┐
│ Is it from a     │──No──▶ Ignore
│ registered source?│
└────────┬────────┘
         │ Yes
         ▼
┌─────────────────┐
│ Send to OpenAI   │
│ for parsing       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ is_relevant?      │──No──▶ Store as "not_relevant", skip
└────────┬────────┘
         │ Yes
         ▼
┌─────────────────┐
│ confidence ≥ 0.8? │──No──▶ Route to Co-pilot (always ask user)
└────────┬────────┘
         │ Yes
         ▼
┌─────────────────┐
│ Check autonomy    │
│ setting for       │
│ this category     │
└────────┬────────┘
         │
    ┌────┼────┐
    ▼    ▼    ▼
  Auto  Co   Dash
    │    │    │
    ▼    ▼    ▼
  Execute  Propose  Display
  + Notify  + Wait   Only
```

## Conflict Detection

```
New Event to Add
        │
        ▼
Get all events for that date for this family
        │
        ▼
For each existing event:
  │
  ├── Time overlap? ──No──▶ Skip
  │         │
  │         │ Yes
  │         ▼
  │   Same parent assigned? ──No──▶ Minor conflict (informational)
  │         │
  │         │ Yes
  │         ▼
  │   CONFLICT DETECTED
  │         │
  │         ▼
  │   Generate suggestions:
  │   1. Can other parent cover new event?
  │   2. Can other parent cover existing event?
  │   3. Is either event skippable?
  │   4. Is there a time flexibility (e.g., pickup window)?
  │
  ▼
No parent assigned to new event?
  │
  ├── One parent free ──▶ Suggest that parent
  ├── Both parents free ──▶ Suggest based on:
  │     - Historical pattern (who usually handles this category?)
  │     - Proximity (who's closer to the location?)
  │     - Load balance (who has fewer events that day?)
  └── Neither parent free ──▶ Flag as conflict, suggest resolution
```

## Category Classification

The parser assigns one of these categories:

| Category | Trigger Words / Patterns |
|----------|-------------------------|
| school | school, class, teacher, homework, report card, field trip, PTA |
| medical | doctor, dentist, checkup, appointment, vaccination, pharmacy |
| extracurricular | practice, game, recital, lesson, tournament, coach |
| social | birthday, party, playdate, dinner, BBQ, gathering |
| household | grocery, repair, maintenance, delivery, cleaning |
| other | anything that doesn't fit above |

## Autonomy Level Behaviors

### Level 1: Dashboard (👁️ "I see it, you decide")
- Agent parses message and displays in feed
- No action buttons except "Add to Calendar" (manual)
- No notifications except daily digest
- User must initiate all actions

### Level 2: Co-pilot (🤝 "I suggest, you approve")
- Agent parses message and proposes actions
- Shows confirm/dismiss buttons
- Sends push notification for time-sensitive items
- Waits for explicit user approval before any calendar writes
- Default for new users

### Level 3: Autopilot (🚀 "I handle it, you're notified")
- Agent parses message and executes if confidence ≥ 0.85
- Automatically adds to calendar, assigns to available parent
- Sends notification after the fact: "Added Picture Day to calendar (Mar 3)"
- Still asks for confirmation if:
  - Confidence < 0.85
  - Conflict detected
  - Involves spending money (gift purchasing, etc.)
  - Medical category (always co-pilot minimum)

## Confidence-Based Override Rules

Regardless of autonomy setting:

| Condition | Behavior |
|-----------|----------|
| Confidence < 0.5 | Always ask user, show raw message prominently |
| Confidence 0.5-0.8 | Co-pilot minimum (even if autopilot set) |
| Confidence ≥ 0.8 | Follow autonomy setting |
| Conflict detected | Always co-pilot minimum |
| Time-sensitive (< 24hrs) | Escalate notification priority |
| Involves money | Always co-pilot minimum |
| Medical category | Always co-pilot minimum |

## Daily Digest Generation

Generated at 7:00 AM user's local time:

```
Good morning! Here's your family's day:

TODAY:
- [time] Event (Owner) 
- [time] Event (Owner)
- ⚠️ Conflict: Event A overlaps with Event B — [suggestion]

NEEDS YOUR ATTENTION:
- 3 messages parsed, awaiting review
- Soccer makeup session conflicts with Farmers Market

THIS WEEK:
- [count] events scheduled
- [count] unassigned events need an owner

REMINDERS:
- Science Fair project due Friday
- Emma's checkup tomorrow — bring insurance card
```

## Message Deduplication

Messages are deduplicated by:
1. Content hash (SHA-256 of normalized message text)
2. Source + timestamp within 5-minute window
3. Parsed event similarity (same event name + date = likely duplicate)

If a duplicate parsed event is detected from a different source, merge the information (take highest confidence fields from each).
