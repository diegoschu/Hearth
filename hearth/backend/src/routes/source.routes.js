const express = require('express');
const { supabase } = require('../config/database');
const { getGroups } = require('../services/whatsapp.service');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    if (!req.user.family_id) return res.json([]);
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

router.get('/whatsapp/groups', async (req, res, next) => {
  try {
    const groups = await getGroups();
    res.json(groups.map((g) => ({ id: g.id || g.chatId, name: g.name || g.subject || 'Unknown Group' })));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { type, name, label, config } = req.body;

    if (!req.user.family_id) {
      return res.status(400).json({ error: { code: 'FAMILY_REQUIRED', message: 'Join or create a family first' } });
    }

    if (!['whatsapp', 'gmail', 'gcal'].includes(type)) {
      return res.status(400).json({ error: { code: 'INVALID_TYPE', message: 'Type must be whatsapp, gmail, or gcal' } });
    }

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: { code: 'INVALID_NAME', message: 'Source name is required' } });
    }

    const { data: source, error } = await supabase
      .from('sources')
      .insert({
        family_id: req.user.family_id,
        created_by: req.user.id,
        type,
        name: String(name).trim(),
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
