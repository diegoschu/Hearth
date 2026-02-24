# Phase 1 — Backend Foundation Setup

This phase delivers a runnable Express backend with:
- Configured middleware (CORS, JSON, error handling)
- Supabase/Postgres connectivity
- SQL schema migration runner
- Google OAuth + JWT session plumbing
- Route scaffolding for auth/family/sources/feed/calendar/settings/digest

## 1) Install dependencies

```bash
cd backend
npm install
```

## 2) Configure environment

```bash
cp .env.example .env
```

Required variables for startup:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `JWT_SECRET`
- `FRONTEND_URL`

If `ENABLE_POLLER=true`, also set WhatsApp/OpenAI keys.

## 3) Run database migration

`DATABASE_URL` must point to a Postgres instance (Supabase DB URL works).

```bash
npm run migrate
```

This applies `src/models/schema.sql` (idempotent + safe to re-run).

## 4) Start backend

```bash
npm run dev
# or
npm start
```

Health check:

```bash
curl http://localhost:3001/health
```

Expected response:

```json
{ "status": "ok", "timestamp": "..." }
```

## Notes

- Cron polling is disabled by default in Phase 1 (`ENABLE_POLLER=false`) to avoid noisy external API calls during local setup.
- OAuth callback route: `GET /auth/google/callback`
- Authenticated APIs require `Authorization: Bearer <jwt>`.
