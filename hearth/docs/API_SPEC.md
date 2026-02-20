# Hearth API Specification

Base URL: `http://localhost:3001/api`

## Authentication

All endpoints except `/auth/*` require a Bearer token in the Authorization header.

```
Authorization: Bearer <jwt_token>
```

---

## Auth

### POST /auth/google
Start Google OAuth flow. Redirects to Google consent screen.

### GET /auth/google/callback
Google OAuth callback. Returns JWT token.
```json
Response: { "token": "jwt...", "user": { "id", "name", "email", "picture" } }
```

### GET /auth/me
Get current authenticated user.
```json
Response: { "id", "name", "email", "familyId", "picture" }
```

---

## Family

### POST /api/family
Create a family group.
```json
Request: { "name": "The Smiths" }
Response: { "id", "name", "inviteCode" }
```

### POST /api/family/join
Join family with invite code.
```json
Request: { "inviteCode": "ABC123" }
Response: { "familyId", "members": [...] }
```

### GET /api/family
Get current user's family details and members.

---

## Sources

### GET /api/sources
List all registered sources for user's family.
```json
Response: [
  {
    "id": "uuid",
    "type": "whatsapp" | "gmail" | "gcal",
    "name": "Lincoln Elementary Parents",
    "label": "School",
    "config": { "chatId": "...", "emailFilter": "..." },
    "status": "connected" | "error",
    "lastPolled": "ISO date",
    "messageCount": 47
  }
]
```

### POST /api/sources
Register a new source.
```json
Request: {
  "type": "whatsapp",
  "name": "Soccer Team U8",
  "label": "Extracurricular",
  "config": { "chatId": "whatsapp-group-id" }
}
```

### DELETE /api/sources/:id
Remove a source.

---

## Feed (Agent Inbox)

### GET /api/feed
Get parsed messages for review.
```json
Query: ?status=pending|confirmed|dismissed&limit=20&offset=0

Response: {
  "items": [
    {
      "id": "uuid",
      "source": { "type": "whatsapp", "name": "Lincoln Elementary" },
      "rawMessage": "Picture Day moved to March 3rd...",
      "parsed": {
        "eventName": "Picture Day",
        "date": "2026-03-03",
        "time": null,
        "location": null,
        "notes": "Solid colors, no logos",
        "actionItems": ["Add to calendar", "Set outfit reminder"],
        "category": "school",
        "confidence": 0.95
      },
      "status": "pending",
      "assignedTo": null,
      "createdAt": "ISO date"
    }
  ],
  "total": 12,
  "pendingCount": 3
}
```

### POST /api/feed/:id/confirm
Confirm a parsed event — pushes to Google Calendar.
```json
Request: {
  "assignTo": "user-id",          // optional: assign to specific parent
  "adjustments": {                 // optional: override parsed values
    "date": "2026-03-04",
    "time": "09:00"
  }
}
Response: { "calendarEventId": "gcal-event-id", "status": "confirmed" }
```

### POST /api/feed/:id/dismiss
Dismiss a parsed event.
```json
Response: { "status": "dismissed" }
```

---

## Calendar

### GET /api/calendar
Get unified family calendar.
```json
Query: ?start=2026-02-20&end=2026-02-27

Response: {
  "days": [
    {
      "date": "2026-02-20",
      "events": [
        {
          "id": "uuid",
          "title": "School Pickup — Emma",
          "start": "2026-02-20T15:15:00Z",
          "end": "2026-02-20T15:45:00Z",
          "owner": { "id", "name" },
          "category": "school",
          "source": "google_calendar",
          "color": "#4A90D9",
          "conflicts": []
        }
      ]
    }
  ],
  "conflicts": [
    {
      "date": "2026-02-22",
      "events": ["event-id-1", "event-id-2"],
      "suggestion": "Reassign Farmers Market to Mom"
    }
  ]
}
```

### POST /api/calendar/sync
Force re-sync from Google Calendar.

---

## Digest

### GET /api/digest
Get daily digest summary.
```json
Response: {
  "date": "2026-02-20",
  "pendingReview": 3,
  "conflicts": 1,
  "eventsToday": 4,
  "eventsThisWeek": 12,
  "upcomingDeadlines": [...],
  "suggestions": [
    "Soccer practice canceled Thursday — Saturday makeup conflicts with Farmers Market"
  ]
}
```

---

## Settings

### GET /api/settings/autonomy
Get autonomy settings for current user.
```json
Response: [
  { "category": "calendar", "level": 2, "label": "Calendar & Scheduling" },
  { "category": "meals", "level": 1, "label": "Meal Planning" },
  ...
]
```

### PUT /api/settings/autonomy
Update autonomy settings.
```json
Request: {
  "category": "groceries",
  "level": 3
}
```

---

## Error Responses

All errors follow:
```json
{
  "error": {
    "code": "CONFLICT_DETECTED",
    "message": "This event conflicts with an existing event",
    "details": { ... }
  }
}
```

Status codes: 400 (bad request), 401 (unauthorized), 404 (not found), 429 (rate limit), 500 (server error)
