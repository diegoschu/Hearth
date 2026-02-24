-- Hearth Database Schema
-- Safe to run multiple times

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Families (household groups)
CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (from Google OAuth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  picture TEXT,
  google_tokens JSONB,
  family_id UUID REFERENCES families(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sources (registered WhatsApp chats, email filters, calendars)
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) NOT NULL,
  created_by UUID REFERENCES users(id) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('whatsapp', 'gmail', 'gcal')),
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'connected' CHECK (status IN ('connected', 'error', 'paused')),
  last_polled TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sources ADD COLUMN IF NOT EXISTS last_error TEXT;

-- Raw Messages (ingested from sources)
CREATE TABLE IF NOT EXISTS raw_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id) NOT NULL,
  family_id UUID REFERENCES families(id) NOT NULL,
  external_id TEXT,
  content TEXT NOT NULL,
  sender TEXT,
  content_hash TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_raw_messages_hash
  ON raw_messages(source_id, content_hash);

-- Parsed Events (AI-extracted structured data)
CREATE TABLE IF NOT EXISTS parsed_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_message_id UUID REFERENCES raw_messages(id) NOT NULL,
  family_id UUID REFERENCES families(id) NOT NULL,
  event_name TEXT,
  date DATE,
  time TIME,
  end_time TIME,
  location TEXT,
  notes TEXT,
  action_items JSONB DEFAULT '[]',
  category TEXT CHECK (category IN ('school', 'medical', 'extracurricular', 'social', 'household', 'other')),
  confidence DECIMAL(3,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'dismissed', 'auto_confirmed')),
  assigned_to UUID REFERENCES users(id),
  google_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calendar Events (synced from Google Calendar)
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  family_id UUID REFERENCES families(id) NOT NULL,
  google_event_id TEXT NOT NULL,
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  location TEXT,
  description TEXT,
  calendar_id TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_events_google
  ON calendar_events(user_id, google_event_id);

-- Autonomy Settings (per-user, per-category)
CREATE TABLE IF NOT EXISTS autonomy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  category TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 2 CHECK (level IN (1, 2, 3)),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category)
);

CREATE OR REPLACE FUNCTION create_default_autonomy()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO autonomy_settings (user_id, category, level) VALUES
    (NEW.id, 'calendar', 2),
    (NEW.id, 'meals', 1),
    (NEW.id, 'groceries', 1),
    (NEW.id, 'consumables', 1),
    (NEW.id, 'medical', 1),
    (NEW.id, 'transport', 2),
    (NEW.id, 'gifts', 1),
    (NEW.id, 'inventory', 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_default_autonomy ON users;
CREATE TRIGGER trigger_default_autonomy
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_autonomy();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_raw_messages_family ON raw_messages(family_id);
CREATE INDEX IF NOT EXISTS idx_raw_messages_processed ON raw_messages(processed);
CREATE INDEX IF NOT EXISTS idx_parsed_events_family ON parsed_events(family_id);
CREATE INDEX IF NOT EXISTS idx_parsed_events_status ON parsed_events(status);
CREATE INDEX IF NOT EXISTS idx_parsed_events_date ON parsed_events(date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_family ON calendar_events(family_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events(start_time);
