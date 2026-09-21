// Centralized environment configuration.
// NEVER hard-code secrets here. Everything comes from process.env,
// populated by .env (git-ignored) locally or by the hosting platform in production.
require('dotenv').config();

function required(name, fallback = undefined) {
  const value = process.env[name] ?? fallback;
  return value;
}

const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // AI Vision provider (defaults to Anthropic; abstracted so it can be swapped).
  aiProvider: process.env.AI_PROVIDER || 'anthropic',
  anthropicApiKey: required('ANTHROPIC_API_KEY', ''),
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
  anthropicApiUrl: process.env.ANTHROPIC_API_URL || 'https://api.anthropic.com/v1/messages',

  // Optional alternate provider slots (leave blank if unused).
  openAiApiKey: required('OPENAI_API_KEY', ''),
  googleVisionApiKey: required('GOOGLE_VISION_API_KEY', ''),

  // Market data provider — no live source is bundled by default (see marketDataProvider.js).
  marketDataApiKey: required('MARKET_DATA_API_KEY', ''),
  marketDataApiUrl: required('MARKET_DATA_API_URL', ''),

  // CORS: comma-separated list of allowed origins for the mobile app / dev tools.
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '*').split(',').map((s) => s.trim()),

  // Basic request throttling.
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),

  maxUploadSizeMb: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '15', 10),
};

function assertConfigured() {
  const warnings = [];
  if (config.aiProvider === 'anthropic' && !config.anthropicApiKey) {
    warnings.push(
      'ANTHROPIC_API_KEY is not set. /api/analyze and /api/identify will return ' +
        'HTTP 503 with "AI provider not configured" until you add it to backend/.env'
    );
  }
  return warnings;
}

module.exports = { config, assertConfigured };
