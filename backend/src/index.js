const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { config, assertConfigured } = require('./config/env');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const healthRoute = require('./routes/health');
const analyzeRoute = require('./routes/analyze');
const identifyRoute = require('./routes/identify');
const valuationRoute = require('./routes/valuation');
const referenceRoute = require('./routes/reference');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.allowedOrigins.includes('*') ? true : config.allowedOrigins,
  })
);
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: `${config.maxUploadSizeMb}mb` }));

const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

app.use('/api/health', healthRoute);
app.use('/api/analyze', analyzeRoute);
app.use('/api/identify', identifyRoute);
app.use('/api/valuation', valuationRoute);
app.use('/api/reference-search', referenceRoute);

app.use(notFoundHandler);
app.use(errorHandler);

const warnings = assertConfigured();
warnings.forEach((w) => console.warn(`[config warning] ${w}`)); // eslint-disable-line no-console

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`ROCK ARCHIVE PRO backend listening on port ${config.port} (${config.nodeEnv})`);
});

module.exports = app;
