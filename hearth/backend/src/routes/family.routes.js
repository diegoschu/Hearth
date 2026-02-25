const express = require('express');
const crypto = require('crypto');
const { query } = require('../config/database');
const { AppError } = require('../middleware/error.middleware');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    if (!req.user.family_id) {
      return res.json({ family: null, message: 'Not part of a family yet' });
    }

    const familyResult = await query('SELECT * FROM families WHERE id = $1 LIMIT 1', [req.user.family_id]);
    const family = familyResult.rows[0];

    if (!family) {
      throw new AppError('Family not found', 404, 'FAMILY_NOT_FOUND');
    }

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
    const name = String(req.body?.name || '').trim();
    if (!name) throw new AppError('Family name is required', 400, 'INVALID_NAME');

    if (req.user.family_id) {
      throw new AppError('User is already in a family', 409, 'ALREADY_IN_FAMILY');
    }

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
    const inviteCode = String(req.body?.inviteCode || '').trim().toUpperCase();
    if (!inviteCode) throw new AppError('Invite code is required', 400, 'INVALID_INVITE_CODE');

    const familyResult = await query('SELECT * FROM families WHERE invite_code = $1 LIMIT 1', [inviteCode]);
    const family = familyResult.rows[0];

    if (!family) {
      throw new AppError('Invalid invite code', 404, 'NOT_FOUND');
    }

    await query('UPDATE users SET family_id = $1, updated_at = NOW() WHERE id = $2', [family.id, req.user.id]);

    const membersResult = await query('SELECT id, name, email, picture FROM users WHERE family_id = $1', [family.id]);

    res.json({ ...family, members: membersResult.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
