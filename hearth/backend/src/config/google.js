const { google } = require('googleapis');
const { supabase } = require('./database');

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

function getAuthUrl() {
  const oauth2Client = createOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    include_granted_scopes: true,
    scope: SCOPES,
    prompt: 'consent',
  });
}

async function getTokensFromCode(code) {
  const oauth2Client = createOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
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

function getAuthenticatedClient(tokens, userId) {
  const client = createOAuthClient();
  const safeTokens = normalizeTokens(tokens);
  client.setCredentials(safeTokens);

  client.on('tokens', async (newTokens) => {
    try {
      if (!userId) return;
      const nextTokens = {
        ...safeTokens,
        ...normalizeTokens(newTokens),
        refresh_token: newTokens.refresh_token || safeTokens.refresh_token || null,
      };

      await supabase
        .from('users')
        .update({ google_tokens: nextTokens, updated_at: new Date().toISOString() })
        .eq('id', userId);
    } catch (err) {
      console.error('[Google] Failed to persist refreshed tokens:', err.message);
    }
  });

  return client;
}

module.exports = {
  SCOPES,
  getAuthUrl,
  getTokensFromCode,
  getAuthenticatedClient,
  normalizeTokens,
};
