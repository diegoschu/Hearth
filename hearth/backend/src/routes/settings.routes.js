const express = require('express');
const { supabase } = require('../config/database');

const router = express.Router();

// GET /api/settings/autonomy — Get autonomy settings for current user
router.get('/autonomy', async (req, res, next) => {
  try {
    const { data: settings, error } = await supabase
      .from('autonomy_settings')
      .select('*')
      .eq('user_id', req.user.id)
      .order('category');

    if (error) throw error;
    res.json(settings || []);
  } catch (err) {
    next(err);
  }
});

// PUT /api/settings/autonomy — Update a category's autonomy level
router.put('/autonomy', async (req, res, next) => {
  try {
    const { category, level } = req.body;

    if (![1, 2, 3].includes(level)) {
      return res.status(400).json({ error: { message: 'Level must be 1, 2, or 3' } });
    }

    const { data, error } = await supabase
      .from('autonomy_settings')
      .upsert(
        { user_id: req.user.id, category, level, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,category' }
      )
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
