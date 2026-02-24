const express = require('express');
const crypto = require('crypto');
const { query } = require('../config/database');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    if (!req.user.family_id) {
      return res.json({ family: null, message: 'Not part of a family yet' });
    }

    const familyResult = await query('SELECT * FROM families WHERE id = $1 LIMIT 1', [req.user.family_id]);
    const family = familyResult.rows[0];

    const membersResult = await query(
      'SELECT id, name, email, picture FROM users WHERE family_id = $1 ORDER BY created_at ASC',
      [req.user.family_id]
    );

    res.json({ ...family, members: membersResult.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body;
    const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    const familyInsert = await query(
      'INSERT INTO families (name, invite_code) VALUES ($1, $2) RETURNING *',
      [name, inviteCode]
    );
    const family = familyInsert.rows[0];

    await query('UPDATE users SET family_id = $1, updated_at = NOW() WHERE id = $2', [family.id, req.user.id]);

    res.status(201).json(family);
  } catch (err) {
    next(err);
  }
});

router.post('/join', async (req, res, next) => {
  try {
    const { inviteCode } = req.body;

    const familyResult = await query('SELECT * FROM families WHERE invite_code = $1 LIMIT 1', [String(inviteCode || '').toUpperCase()]);
    const family = familyResult.rows[0];

    if (!family) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Invalid invite code' } });
    }

    await query('UPDATE users SET family_id = $1, updated_at = NOW() WHERE id = $2', [family.id, req.user.id]);

    const membersResult = await query('SELECT id, name, email, picture FROM users WHERE family_id = $1', [family.id]);

    res.json({ ...family, members: membersResult.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
