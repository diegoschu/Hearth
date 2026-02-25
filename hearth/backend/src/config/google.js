const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const { query } = require('./database');

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

function isGoogleOAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI);
}

function normalizeTokens(tokens = {}) {
  return {
    access_token: tokens.access_token || null,
    refresh_token: tokens.refresh_token || null,
    scope: tokens.scope || null,
    token_type: tokens.token_type || 'Bearer',
    expiry_date: tokens.expiry_date || null,
  };
}

function mergeTokenSets(existingTokens = {}, incomingTokens = {}) {
  const existing = normalizeTokens(existingTokens);
  const incoming = normalizeTokens(incomingTokens);

  return {
    access_token: incoming.access_token || existing.access_token || null,
    refresh_token: incoming.refresh_token || existing.refresh_token || null,
    scope: incoming.scope || existing.scope || null,
    token_type: incoming.token_type || existing.token_type || 'Bearer',
    expiry_date: incoming.expiry_date || existing.expiry_date || null,
  };
}

function buildOAuthState(payload = {}) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required for OAuth state signing');
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '10m' });
}

function verifyOAuthState(state) {
  if (!state) return null;
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required for OAuth state verification');
  return jwt.verify(state, process.env.JWT_SECRET);
}

function getAuthUrl({ state } = {}) {
  const oauth2Client = createOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    include_granted_scopes: true,
    scope: SCOPES,
    prompt: 'consent',
    ...(state ? { state } : {}),
  });
}

async function getTokensFromCode(code) {
  const oauth2Client = createOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

async function persistGoogleTokens(userId, tokens) {
  if (!userId) return;
  await query('UPDATE users SET google_tokens = $1::jsonb, updated_at = NOW() WHERE id = $2', [JSON.stringify(tokens), userId]);
}

function getAuthenticatedClient(tokens, userId) {
  const client = createOAuthClient();
  const safeTokens = normalizeTokens(tokens);
  client.setCredentials(safeTokens);

  client.on('tokens', async (newTokens) => {
    try {
      if (!userId) return;
      const nextTokens = mergeTokenSets(safeTokens, newTokens);
      await persistGoogleTokens(userId, nextTokens);
    } catch (err) {
      console.error('[Google] Failed to persist refreshed tokens:', err.message);
    }
  });

  return client;
}

module.exports = {
  SCOPES,
  isGoogleOAuthConfigured,
  getAuthUrl,
  getTokensFromCode,
  getAuthenticatedClient,
  normalizeTokens,
  mergeTokenSets,
  buildOAuthState,
  verifyOAuthState,
  persistGoogleTokens,
};
