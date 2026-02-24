# Hearth 🏠

Hearth is a family operations agent demo:
- Google OAuth sign-in
- Family creation/join by invite code
- Source registry (WhatsApp/Gmail/GCal)
- WhatsApp polling adapter scaffold with retries and error classification
- AI parser service with schema validation and safe fallback
- Agent orchestration with autonomy safety overrides
- Feed, calendar, settings, digest APIs
- Frontend wired to live backend APIs + auth callback routing + loading/error + polling

---

## Monorepo Structure

- `backend/` Node + Express + Supabase + Google APIs
- `frontend/` React + Vite
- `docs/` API and logic docs

---

## Local Demo Run (Exact Steps)

### 1) Backend setup

```bash
cd backend
cp .env.example .env
# fill all required vars (see checklist below)
npm install
npm run migrate
npm run dev
```

### 2) Frontend setup

```bash
cd ../frontend
cp .env.example .env
npm install
npm run dev
```

### 3) Open app

- Frontend: `http://localhost:5173`
- Click **Continue with Google**
- OAuth callback returns to `/auth/callback?token=...`
- App loads live data from backend

---

## Hosted Demo Run (Railway + Vercel)

### Backend (Railway)
1. Deploy `backend/` service.
2. Add env vars from checklist.
3. Run migration once: `npm run migrate`.
4. Start command: `npm start`.

### Frontend (Vercel)
1. Deploy `frontend/`.
2. Set `VITE_API_BASE_URL=https://<your-backend-domain>`.
3. Re-deploy.

### Google OAuth for external-device demo accounts
- Add both redirect URIs in Google Cloud OAuth app:
  - `http://localhost:3001/auth/google/callback`
  - `https://<backend-domain>/auth/google/callback`
- Add allowed JS/origin URLs for local + hosted frontend domains.
- If app is in Testing mode, whitelist all demo account emails in OAuth consent screen test users.

---

## Environment Checklist

### Backend `.env`
- `NODE_ENV`
- `PORT`
- `FRONTEND_URL`
- `JWT_SECRET`
- `ENABLE_POLLER`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `DATABASE_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `RAPIDAPI_KEY`
- `RAPIDAPI_WHATSAPP_HOST`
- `OPENAI_API_KEY`
- Optional: `OPENAI_MODEL`

### Frontend `.env`
- `VITE_API_BASE_URL`

---

## Current Known Limitations

1. WhatsApp adapter is provider-agnostic scaffold; endpoint paths may need adjustment for your selected RapidAPI provider.
2. Gmail polling ingestion is not yet implemented (source type exists; ingestion path pending).
3. Family onboarding UI is basic (API-ready, minimal UX).
4. Conflict suggestions are simple overlap checks and not yet optimization-based.
5. No end-to-end integration tests yet (unit test coverage started for parser validation).

---

## Validation Run Results

- Backend tests: ✅ `npm test`
- Frontend build: ✅ `npm run build`
