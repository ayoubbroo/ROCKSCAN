const { validate } = require('../services/validation');

function validateBody(schemaName) {
  return (req, res, next) => {
    const { valid, errors } = validate(schemaName, req.body);
    if (!valid) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: `Request body failed validation against ${schemaName}`,
        details: errors,
      });
    }
    next();
  };
}

module.exports = { validateBody };
