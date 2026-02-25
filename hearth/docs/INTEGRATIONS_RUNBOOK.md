# Integrations Runbook (Google OAuth, Calendar, Gmail, WhatsApp)

## Scope
This runbook covers:
- Google OAuth login + callback hardening
- Token persistence + refresh-token retention
- Calendar/Gmail source guardrails (scope + credential checks)
- WhatsApp adapter graceful degradation

## Quick Health Checks
1. Backend health:
   - `GET /health`
   - `GET /ready`
2. Google OAuth configured?
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` present
3. WhatsApp configured?
   - `RAPIDAPI_KEY`, `RAPIDAPI_WHATSAPP_HOST` present
4. User token shape in DB:
   - `users.google_tokens` should contain `access_token`, optional `refresh_token`, `scope`, `expiry_date`

## OAuth Flow Notes
- `/auth/google` now signs OAuth `state` with `JWT_SECRET` and optional `returnTo` path.
- `/auth/google/callback` now:
  - handles provider-denied flow (`error`, `error_description`)
  - validates signed `state`
  - merges incoming tokens with existing DB token set to preserve refresh token when Google omits it
  - redirects to frontend with structured error query params on failure

## Token Persistence and Refresh
- Tokens are normalized into a stable shape.
- When Google client emits refreshed tokens, backend persists merged tokens for the user.
- Refresh token is preserved from existing token set unless Google explicitly sends a new one.

## Integration Guardrails
### Gmail / GCal source creation
Source creation now fails fast with `412` when:
- Google account is disconnected (`GOOGLE_REAUTH_REQUIRED`)
- Required scope is missing (`GOOGLE_SCOPE_MISSING`)

### WhatsApp source creation
Source creation fails fast when:
- Server env not configured (`WHATSAPP_NOT_CONFIGURED`)
- `config.chatId` missing (`INVALID_SOURCE_CONFIG`)

### Calendar sync behavior
`POST /api/calendar/sync` now degrades gracefully:
- returns `{ degraded: true, synced: 0, error }` for recoverable integration states
- avoids generic 500 for common auth/scope drift

## Common Failure Modes + Fixes
1. **`INVALID_OAUTH_STATE`**
   - Cause: stale callback or tampered state
   - Fix: restart OAuth flow from `/auth/google`

2. **`GOOGLE_REAUTH_REQUIRED`**
   - Cause: no access/refresh token for user
   - Fix: reconnect via Google login

3. **`GOOGLE_SCOPE_MISSING`**
   - Cause: token missing Gmail/Calendar scopes
   - Fix: force reconnection and approve updated scopes

4. **`WHATSAPP_NOT_CONFIGURED`**
   - Cause: missing RapidAPI env vars
   - Fix: set `RAPIDAPI_KEY` and `RAPIDAPI_WHATSAPP_HOST`, restart backend

5. **Calendar sync degraded with `GCAL_SYNC_FAILED`**
   - Cause: transient upstream issue/rate limit
   - Fix: retry sync; inspect backend logs for upstream status codes

## Validation Commands
```bash
cd backend
npm test
npm run dev
```

Manual checks:
- Connect Google via frontend and verify callback success
- Create `gcal` and `gmail` sources under connected user
- Create `whatsapp` source with/without env configured and verify error messaging
- Trigger `/api/calendar/sync` with valid/invalid Google grants and confirm degraded payload
