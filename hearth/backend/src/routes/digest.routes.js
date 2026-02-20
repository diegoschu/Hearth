const express = require('express');
const { generateDigest } = require('../services/agent.service');

const router = express.Router();

// GET /api/digest — Get daily digest summary
router.get('/', async (req, res, next) => {
  try {
    const digest = await generateDigest(req.user.family_id);
    res.json(digest);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
