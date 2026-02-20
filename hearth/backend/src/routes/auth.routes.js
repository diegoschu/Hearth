const express = require('express');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
const { getAuthUrl, getTokensFromCode, getAuthenticatedClient } = require('../config/google');
const { supabase } = require('../config/database');

const router = express.Router();

// GET /auth/google — Redirect to Google OAuth
router.get('/google', (req, res) => {
  const url = getAuthUrl();
  res.redirect(url);
});

// GET /auth/google/callback — Handle OAuth callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'Missing authorization code' });

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);
    const authClient = getAuthenticatedClient(tokens);

    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: authClient });
    const { data: profile } = await oauth2.userinfo.get();

    // Upsert user in database
    const { data: user, error } = await supabase
      .from('users')
      .upsert(
        {
          google_id: profile.id,
          email: profile.email,
          name: profile.name,
          picture: profile.picture,
          google_tokens: tokens,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'google_id' }
      )
      .select()
      .single();

    if (error) throw error;

    // Generate JWT
    const jwtToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${jwtToken}`);
  } catch (err) {
    console.error('[Auth] Google callback error:', err.message);
    res.redirect(`${process.env.FRONTEND_URL}/auth/error`);
  }
});

// GET /auth/me — Get current user (requires JWT in query for initial load)
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.query.token;
    if (!token) return res.status(401).json({ error: 'No token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { data: user } = await supabase
      .from('users')
      .select('id, email, name, picture, family_id')
      .eq('id', decoded.userId)
      .single();

    res.json(user);
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
