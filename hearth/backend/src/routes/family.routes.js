const express = require('express');
const crypto = require('crypto');
const { supabase } = require('../config/database');

const router = express.Router();

// GET /api/family — Get current user's family
router.get('/', async (req, res, next) => {
  try {
    if (!req.user.family_id) {
      return res.json({ family: null, message: 'Not part of a family yet' });
    }

    const { data: family } = await supabase
      .from('families')
      .select('*')
      .eq('id', req.user.family_id)
      .single();

    const { data: members } = await supabase
      .from('users')
      .select('id, name, email, picture')
      .eq('family_id', req.user.family_id);

    res.json({ ...family, members });
  } catch (err) {
    next(err);
  }
});

// POST /api/family — Create a new family
router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body;
    const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    const { data: family, error } = await supabase
      .from('families')
      .insert({ name, invite_code: inviteCode })
      .select()
      .single();

    if (error) throw error;

    // Assign user to family
    await supabase
      .from('users')
      .update({ family_id: family.id })
      .eq('id', req.user.id);

    res.status(201).json(family);
  } catch (err) {
    next(err);
  }
});

// POST /api/family/join — Join a family with invite code
router.post('/join', async (req, res, next) => {
  try {
    const { inviteCode } = req.body;

    const { data: family } = await supabase
      .from('families')
      .select('*')
      .eq('invite_code', inviteCode.toUpperCase())
      .single();

    if (!family) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Invalid invite code' } });
    }

    await supabase
      .from('users')
      .update({ family_id: family.id })
      .eq('id', req.user.id);

    const { data: members } = await supabase
      .from('users')
      .select('id, name, email, picture')
      .eq('family_id', family.id);

    res.json({ ...family, members });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
