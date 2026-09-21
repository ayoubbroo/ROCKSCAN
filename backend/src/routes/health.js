const express = require('express');
const { config, assertConfigured } = require('../config/env');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'rock-archive-pro-backend',
    aiProvider: config.aiProvider,
    aiProviderConfigured: Boolean(config.anthropicApiKey),
    marketDataConfigured: Boolean(config.marketDataApiUrl && config.marketDataApiKey),
    warnings: assertConfigured(),
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
