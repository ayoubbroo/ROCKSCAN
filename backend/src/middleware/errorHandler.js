function notFoundHandler(req, res) {
  res.status(404).json({ error: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status =
    err.code === 'PROVIDER_NOT_CONFIGURED' ? 503 :
    err.code === 'PROVIDER_REQUEST_FAILED' ? 502 :
    err.code === 'PROVIDER_MALFORMED_JSON' ? 502 :
    err.code === 'PROVIDER_SCHEMA_INVALID' ? 502 :
    err.status || 500;

  const payload = {
    error: err.code || 'INTERNAL_ERROR',
    message: err.message || 'Unexpected server error',
  };
  if (err.details) payload.details = err.details;

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error('[error]', err);
  }

  res.status(status).json(payload);
}

module.exports = { notFoundHandler, errorHandler };
