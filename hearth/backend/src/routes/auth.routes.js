const express = require('express');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
const {
  getAuthUrl,
  getTokensFromCode,
  getAuthenticatedClient,
  normalizeTokens,
  mergeTokenSets,
  buildOAuthState,
  verifyOAuthState,
  isGoogleOAuthConfigured,
} = require('../config/google');
const { query } = require('../config/database');

const router = express.Router();

function safeFrontendUrl(pathname = '/auth/error') {
  const base = process.env.FRONTEND_URL || 'http://localhost:5173';
  const url = new URL(pathname, base);
  return `${url.origin}${url.pathname}${url.search}`;
}

router.get('/google', (req, res) => {
  if (!isGoogleOAuthConfigured()) {
    return res.status(503).json({ error: { code: 'GOOGLE_NOT_CONFIGURED', message: 'Google OAuth is not configured' } });
  }

  const returnTo = req.query.returnTo && String(req.query.returnTo).startsWith('/') ? String(req.query.returnTo) : '/auth/callback';
  const state = buildOAuthState({ returnTo });
  res.redirect(getAuthUrl({ state }));
});

router.get('/google/callback', async (req, res) => {
  try {
    const { code, state, error, error_description: errorDescription } = req.query;

    if (error) {
      const params = new URLSearchParams({ code: 'GOOGLE_OAUTH_DENIED', message: String(errorDescription || error) });
      return res.redirect(`${safeFrontendUrl('/auth/error')}?${params.toString()}`);
    }

    if (!code) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing authorization code' } });
    }

    let oauthState;
    try {
      oauthState = verifyOAuthState(state);
    } catch (stateError) {
      return res.redirect(`${safeFrontendUrl('/auth/error')}?code=INVALID_OAUTH_STATE`);
    }

    const incomingTokens = normalizeTokens(await getTokensFromCode(code));
    const authClient = getAuthenticatedClient(incomingTokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: authClient });
    const { data: profile } = await oauth2.userinfo.get();

    const existingResult = await query(
      `SELECT id, google_tokens FROM users
       WHERE google_id = $1 OR email = $2
       LIMIT 1`,
      [profile.id, profile.email]
    );

    const existingUser = existingResult.rows[0];
    const mergedTokens = mergeTokenSets(existingUser?.google_tokens, incomingTokens);

    const upsertSql = `
      INSERT INTO users (google_id, email, name, picture, google_tokens, updated_at)
      VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
      ON CONFLICT (google_id)
      DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        picture = EXCLUDED.picture,
        google_tokens = EXCLUDED.google_tokens,
        updated_at = NOW()
      RETURNING id, email
    `;

    const upsert = await query(upsertSql, [
      profile.id,
      profile.email,
      profile.name,
      profile.picture,
      JSON.stringify(mergedTokens),
    ]);

    const user = upsert.rows[0];
    const jwtToken = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' });

    const callbackPath = oauthState?.returnTo && String(oauthState.returnTo).startsWith('/') ? oauthState.returnTo : '/auth/callback';
    const redirect = new URL(callbackPath, process.env.FRONTEND_URL);
    redirect.searchParams.set('token', jwtToken);

    return res.redirect(redirect.toString());
  } catch (err) {
    console.error('[Auth] Google callback error:', err.message);
    const params = new URLSearchParams({ code: 'GOOGLE_CALLBACK_FAILED', message: 'Google sign-in failed. Please retry.' });
    return res.redirect(`${safeFrontendUrl('/auth/error')}?${params.toString()}`);
  }
});

router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.query.token;
    if (!token) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No token' } });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query(
      `SELECT id, email, name, picture, family_id
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [decoded.userId]
    );

    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token user' } });

    res.json(user);
  } catch (err) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
  }
});

module.exports = router;
