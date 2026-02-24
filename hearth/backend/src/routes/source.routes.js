const express = require('express');
const { query } = require('../config/database');
const { getGroups } = require('../services/whatsapp.service');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    if (!req.user.family_id) return res.json([]);

    const result = await query(
      'SELECT * FROM sources WHERE family_id = $1 ORDER BY created_at DESC',
      [req.user.family_id]
    );

    res.json(result.rows || []);
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

    const insert = await query(
      `INSERT INTO sources (family_id, created_by, type, name, label, config, status)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'connected')
       RETURNING *`,
      [req.user.family_id, req.user.id, type, String(name).trim(), label || 'General', JSON.stringify(config || {})]
    );

    res.status(201).json(insert.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM sources WHERE id = $1 AND family_id = $2', [req.params.id, req.user.family_id]);
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
