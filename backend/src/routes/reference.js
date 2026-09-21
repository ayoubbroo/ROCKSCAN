const express = require('express');
const { validateBody } = require('../middleware/validateRequest');
const { getGeologyKnowledgeProvider } = require('../services/geologyKnowledgeProvider');

const router = express.Router();

router.post('/', validateBody('referenceSearchRequest'), (req, res, next) => {
  try {
    const { query, category } = req.body;
    const knowledge = getGeologyKnowledgeProvider();
    const results = knowledge.search({ query, category });
    res.json({ status: 'ok', count: results.length, results });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
