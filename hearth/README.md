# Hearth 🏠

**Your family's second brain** — An AI-powered household operations agent that parses messages from WhatsApp and email, manages a unified family calendar, and automates household logistics.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND (React)                  │
│  Feed │ Calendar │ Sources │ Settings                │
└──────────────┬──────────────────────────────────────┘
               │ REST API
┌──────────────▼──────────────────────────────────────┐
│                 BACKEND (Node.js/Express)            │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Message   │  │ Calendar │  │ Agent Intelligence │  │
│  │ Ingestion │  │ Service  │  │ (OpenAI GPT-4)    │  │
│  └─────┬────┘  └────┬─────┘  └────────┬──────────┘  │
│        │            │                  │              │
│  ┌─────▼────┐ ┌────▼─────┐  ┌────────▼──────────┐  │
│  │ WhatsApp │ │ Google   │  │ Parser / Decision  │  │
│  │ RapidAPI │ │ Cal API  │  │ Engine             │  │
│  └──────────┘ └──────────┘  └────────────────────┘  │
│                                                      │
│              ┌──────────────┐                        │
│              │  PostgreSQL  │                        │
│              │  (Supabase)  │                        │
│              └──────────────┘                        │
└──────────────────────────────────────────────────────┘
```

## Core Features

### 1. Message Ingestion (Inputs)
- **WhatsApp**: Via RapidAPI WhatsApp API — monitor registered group chats
- **Gmail**: Via Google Gmail API — watch specific senders/labels
- **Manual**: Users can paste/forward messages directly

### 2. Agent Intelligence (Processing)
- Parse unstructured messages → extract events, dates, locations, action items
- Conflict detection across family calendars
- Suggest task assignments based on parent availability
- Confidence scoring on parsed data

### 3. Unified Calendar (Core State)
- Merge Google Calendars from both parents
- Color-coded ownership (Mom/Dad/Family)
- Conflict flagging and resolution suggestions

### 4. Autonomy Control (Output Modes)
- **Dashboard** (👁️): Agent surfaces info, user acts
- **Co-pilot** (🤝): Agent proposes, user approves
- **Autopilot** (🚀): Agent acts, user is notified
- Per-category and per-parent settings

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| Backend | Node.js + Express |
| Database | PostgreSQL (Supabase) |
| WhatsApp | RapidAPI - WhatsApp API |
| Calendar | Google Calendar API |
| Email | Google Gmail API |
| AI/Parsing | OpenAI GPT-4o-mini |
| Auth | Google OAuth 2.0 |
| Hosting | Vercel (frontend) + Railway (backend) |

## Environment Variables

```env
# Backend (.env)
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://...

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback

# RapidAPI - WhatsApp
RAPIDAPI_KEY=
RAPIDAPI_WHATSAPP_HOST=

# OpenAI
OPENAI_API_KEY=

# JWT
JWT_SECRET=
```

## Getting Started

```bash
# Install dependencies
cd frontend && npm install
cd ../backend && npm install

# Set up environment
cp backend/.env.example backend/.env
# Fill in required vars (Supabase + JWT + OAuth)

# Run DB migration
cd backend && npm run migrate

# Run development
cd backend && npm run dev    # Terminal 1
cd frontend && npm run dev   # Terminal 2
```

## Project Structure

```
hearth/
├── frontend/
│   ├── src/
│   │   ├── components/     # React UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── utils/          # Helper functions
│   │   ├── styles/         # Global styles
│   │   ├── App.jsx         # Main app component
│   │   └── main.jsx        # Entry point
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Auth, error handling
│   │   ├── config/        # API configs
│   │   └── models/        # Database models
│   ├── package.json
│   └── .env.example
├── docs/
│   ├── CODEX_INSTRUCTIONS.md
│   ├── API_SPEC.md
│   └── AGENT_LOGIC.md
└── README.md
```

## API Endpoints

See [docs/API_SPEC.md](docs/API_SPEC.md) for full specification.

## Agent Logic

See [docs/AGENT_LOGIC.md](docs/AGENT_LOGIC.md) for parsing rules and decision trees.

## Phase 1 Setup Notes

See [docs/PHASE1_BACKEND_SETUP.md](docs/PHASE1_BACKEND_SETUP.md) for backend foundation setup, migration, and run instructions.
