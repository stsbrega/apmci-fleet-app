const { validationResult } = require('express-validator');

/**
 * Middleware to handle validation errors
 */
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: {
        message: 'Validation failed',
        details: errors.array().map(err => ({
          field: err.path,
          message: err.msg
        }))
      }
    });
  }

  next();
};

module.exports = {
  handleValidation
};
