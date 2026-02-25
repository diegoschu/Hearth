const express = require('express');
const { query } = require('../config/database');
const { getGroups } = require('../services/whatsapp.service');
const { validateSourceConfig, isWhatsAppConfigured } = require('../services/integrations.service');
const { AppError } = require('../middleware/error.middleware');

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
    if (!isWhatsAppConfigured()) {
      return res.json({ degraded: true, reason: 'WHATSAPP_NOT_CONFIGURED', groups: [] });
    }

    const groups = await getGroups();
    res.json({
      degraded: false,
      groups: groups.map((g) => ({ id: g.id || g.chatId, name: g.name || g.subject || 'Unknown Group' })),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { type, name, label, config } = req.body;

    if (!req.user.family_id) {
      throw new AppError('Join or create a family first', 400, 'FAMILY_REQUIRED');
    }

    if (!['whatsapp', 'gmail', 'gcal'].includes(type)) {
      throw new AppError('Type must be whatsapp, gmail, or gcal', 400, 'INVALID_TYPE');
    }

    if (!name || !String(name).trim()) {
      throw new AppError('Source name is required', 400, 'INVALID_NAME');
    }

    const cleanConfig = config || {};
    validateSourceConfig({ type, config: cleanConfig, user: req.user });

    const insert = await query(
      `INSERT INTO sources (family_id, created_by, type, name, label, config, status)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'connected')
       RETURNING *`,
      [req.user.family_id, req.user.id, type, String(name).trim(), String(label || 'General').trim() || 'General', JSON.stringify(cleanConfig)]
    );

    res.status(201).json(insert.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query('DELETE FROM sources WHERE id = $1 AND family_id = $2', [req.params.id, req.user.family_id]);
    if (result.rowCount === 0) {
      throw new AppError('Source not found', 404, 'SOURCE_NOT_FOUND');
    }
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
