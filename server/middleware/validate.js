const { sanitizeInput, isValidEmail, isValidTelegramUsername } = require('../utils/helpers');

/**
 * Input Validation Middleware
 * Validates and sanitizes user input
 */

/**
 * Validate email address
 */
const validateEmail = (field = 'email') => {
  return (req, res, next) => {
    const value = req.body[field];
    if (value && !isValidEmail(value)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address',
      });
    }
    next();
  };
};

/**
 * Validate Telegram username
 */
const validateUsername = (field = 'username') => {
  return (req, res, next) => {
    const value = req.body[field];
    if (value && !isValidTelegramUsername(value)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid username',
      });
    }
    next();
  };
};

/**
 * Validate positive number
 */
const validatePositiveNumber = (field = 'amount') => {
  return (req, res, next) => {
    const value = req.body[field];
    if (value !== undefined && (typeof value !== 'number' || value <= 0)) {
      return res.status(400).json({
        success: false,
        error: `${field} must be a positive number`,
      });
    }
    next();
  };
};

/**
 * Validate required fields
 */
const validateRequired = (fields) => {
  return (req, res, next) => {
    const missing = [];
    for (const field of fields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missing.push(field);
      }
    }
    
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missing.join(', ')}`,
      });
    }
    next();
  };
};

/**
 * Sanitize all string inputs
 */
const sanitizeInputs = (req, res, next) => {
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeInput(req.body[key]);
      }
    }
  }
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeInput(req.query[key]);
      }
    }
  }
  if (req.params) {
    for (const key in req.params) {
      if (typeof req.params[key] === 'string') {
        req.params[key] = sanitizeInput(req.params[key]);
      }
    }
  }
  next();
};

/**
 * Validate pagination parameters
 */
const validatePagination = (req, res, next) => {
  const { limit = 20, offset = 0 } = req.query;
  
  const parsedLimit = parseInt(limit);
  const parsedOffset = parseInt(offset);
  
  if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    return res.status(400).json({
      success: false,
      error: 'Invalid limit parameter (must be between 1 and 100)',
    });
  }
  
  if (isNaN(parsedOffset) || parsedOffset < 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid offset parameter (must be >= 0)',
    });
  }
  
  req.query.limit = parsedLimit;
  req.query.offset = parsedOffset;
  next();
};

module.exports = {
  validateEmail,
  validateUsername,
  validatePositiveNumber,
  validateRequired,
  sanitizeInputs,
  validatePagination,
};
