const express = require('express');
const { generateDigest } = require('../services/agent.service');
const { AppError } = require('../middleware/error.middleware');

const router = express.Router();

// GET /api/digest — Get daily digest summary
router.get('/', async (req, res, next) => {
  try {
    if (!req.user.family_id) {
      throw new AppError('Join or create a family first', 400, 'FAMILY_REQUIRED');
    }

    const digest = await generateDigest(req.user.family_id);
    res.json(digest);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
