const express = require('express');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
const { getAuthUrl, getTokensFromCode, getAuthenticatedClient, normalizeTokens } = require('../config/google');
const { query } = require('../config/database');

const router = express.Router();

router.get('/google', (req, res) => {
  res.redirect(getAuthUrl());
});

router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing authorization code' } });

    const tokens = normalizeTokens(await getTokensFromCode(code));
    const authClient = getAuthenticatedClient(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: authClient });
    const { data: profile } = await oauth2.userinfo.get();

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
      JSON.stringify(tokens),
    ]);

    const user = upsert.rows[0];
    const jwtToken = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${encodeURIComponent(jwtToken)}`);
  } catch (err) {
    console.error('[Auth] Google callback error:', err.message);
    res.redirect(`${process.env.FRONTEND_URL}/auth/error`);
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
