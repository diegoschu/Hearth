const express = require('express');
const { query } = require('../config/database');
const { AppError } = require('../middleware/error.middleware');

const router = express.Router();

router.get('/autonomy', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM autonomy_settings WHERE user_id = $1 ORDER BY category ASC',
      [req.user.id]
    );

    res.json(result.rows || []);
  } catch (err) {
    next(err);
  }
});

router.put('/autonomy', async (req, res, next) => {
  try {
    const category = String(req.body?.category || '').trim();
    const level = Number(req.body?.level);

    if (!category) {
      throw new AppError('Category is required', 400, 'INVALID_CATEGORY');
    }

    if (![1, 2, 3].includes(level)) {
      throw new AppError('Level must be 1, 2, or 3', 400, 'INVALID_LEVEL');
    }

    const result = await query(
      `INSERT INTO autonomy_settings (user_id, category, level, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, category)
       DO UPDATE SET level = EXCLUDED.level, updated_at = NOW()
       RETURNING *`,
      [req.user.id, category, level]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
