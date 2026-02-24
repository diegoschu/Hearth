# Hearth 🏠

Hearth is a family operations agent demo:
- Google OAuth sign-in
- Family creation/join by invite code
- Source registry (WhatsApp/Gmail/GCal)
- AI parsing + review feed + calendar sync + digest
- Deployable backend/frontend for external phone access

---

## Monorepo
- `backend/` Express API (Postgres-first; works with Supabase Postgres too)
- `frontend/` React + Vite
- `docs/` specs/notes

---

## Local Run

### Backend
```bash
cd backend
cp .env.example .env
npm install
npm run migrate
npm run dev
```

### Frontend
```bash
cd ../frontend
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`.

---

## Production Demo Deploy

### Railway (backend)
- Root directory: `backend`
- Build command: `npm ci`
- Start command: `npm start`
- Optional one-time migration command: `npm run migrate`
- Health check path: `/health`
- Readiness check path: `/ready`

Required backend env vars:
- `NODE_ENV=production`
- `PORT` (Railway usually injects this)
- `FRONTEND_URL=https://<your-vercel-domain>`
- `JWT_SECRET=<strong-random-string>`
- `DATABASE_URL=<railway postgres url or supabase postgres url>`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI=https://<your-railway-domain>/auth/google/callback`

Optional backend env vars:
- `ENABLE_POLLER=false` (set true only when ready)
- `RAPIDAPI_KEY`
- `RAPIDAPI_WHATSAPP_HOST`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` (not required anymore)

### Vercel (frontend)
- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`

Required frontend env vars:
- `VITE_API_BASE_URL=https://<your-railway-domain>`

---

## Google OAuth Setup (required for external phone demo)
In Google Cloud OAuth client settings add:
- Authorized redirect URI:
  - `http://localhost:3001/auth/google/callback`
  - `https://<your-railway-domain>/auth/google/callback`
- Authorized JavaScript origins:
  - `http://localhost:5173`
  - `https://<your-vercel-domain>`

If OAuth consent screen is in **Testing**, add all demo account emails as test users.

---

## Health/Readiness
- `GET /health` → app + DB liveness
- `GET /ready` → DB readiness for serving traffic

---

## Validation
- Backend tests: `cd backend && npm test`
- Frontend build: `cd frontend && npm run build`
