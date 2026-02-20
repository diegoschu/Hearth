const express = require('express');
const { supabase } = require('../config/database');

const router = express.Router();

// GET /api/sources — List all sources for user's family
router.get('/', async (req, res, next) => {
  try {
    const { data: sources, error } = await supabase
      .from('sources')
      .select('*')
      .eq('family_id', req.user.family_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(sources || []);
  } catch (err) {
    next(err);
  }
});

// POST /api/sources — Register a new source
router.post('/', async (req, res, next) => {
  try {
    const { type, name, label, config } = req.body;

    if (!['whatsapp', 'gmail', 'gcal'].includes(type)) {
      return res.status(400).json({ error: { code: 'INVALID_TYPE', message: 'Type must be whatsapp, gmail, or gcal' } });
    }

    const { data: source, error } = await supabase
      .from('sources')
      .insert({
        family_id: req.user.family_id,
        created_by: req.user.id,
        type,
        name,
        label: label || 'General',
        config: config || {},
        status: 'connected',
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(source);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/sources/:id — Remove a source
router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('sources')
      .delete()
      .eq('id', req.params.id)
      .eq('family_id', req.user.family_id);

    if (error) throw error;
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
