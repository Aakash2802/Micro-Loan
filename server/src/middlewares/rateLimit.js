// server/src/middlewares/rateLimit.js
const rateLimit = require('express-rate-limit');

/**
 * Create rate limiter with custom options
 * @param {Object} options - Rate limiter options
 * @returns {Function} - Express middleware
 */
const createRateLimiter = (options = {}) => {
  // Skip rate limiting in test and development environment (for Cypress E2E tests)
  if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
    return (req, res, next) => next();
  }

  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      success: false,
      message: 'Too many requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res, next, options) => {
      res.status(429).json(options.message);
    },
  };

  return rateLimit({ ...defaultOptions, ...options });
};

/**
 * General API rate limiter
 * 100 requests per 15 minutes
 */
const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

/**
 * Strict rate limiter for authentication routes
 * 5 login attempts per 15 minutes
 */
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
    code: 'AUTH_RATE_LIMIT',
  },
  skipSuccessfulRequests: true, // Don't count successful logins
});

/**
 * Registration rate limiter
 * 3 registrations per hour per IP
 */
const registrationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    message: 'Too many accounts created. Please try again after an hour.',
    code: 'REGISTRATION_RATE_LIMIT',
  },
});

/**
 * Password reset rate limiter
 * 3 requests per hour
 */
const passwordResetLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again after an hour.',
    code: 'PASSWORD_RESET_RATE_LIMIT',
  },
});

/**
 * API write operations rate limiter
 * 30 write requests per minute
 */
const writeLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
    code: 'WRITE_RATE_LIMIT',
  },
});

/**
 * Report generation rate limiter
 * 10 reports per hour
 */
const reportLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    message: 'Too many report requests. Please try again later.',
    code: 'REPORT_RATE_LIMIT',
  },
});

/**
 * PDF download rate limiter
 * 20 downloads per hour
 */
const downloadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: {
    success: false,
    message: 'Too many download requests. Please try again later.',
    code: 'DOWNLOAD_RATE_LIMIT',
  },
});

/**
 * File upload rate limiter
 * 10 uploads per hour per user
 */
const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  keyGenerator: (req) => req.user?.userId?.toString() || req.ip,
  message: {
    success: false,
    message: 'Too many file uploads. Please try again later.',
    code: 'UPLOAD_RATE_LIMIT',
  },
});

/**
 * Sliding window rate limiter based on user ID
 * More sophisticated rate limiting per authenticated user
 */
const userRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute per user
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise use IP
    return req.user?.userId?.toString() || req.ip;
  },
  message: {
    success: false,
    message: 'Request limit exceeded. Please wait before making more requests.',
    code: 'USER_RATE_LIMIT',
  },
});

/**
 * Dynamic rate limiter based on user role
 * Admins get higher limits
 */
const roleBasedLimiter = (req, res, next) => {
  const limits = {
    admin: 200,
    officer: 100,
    customer: 50,
  };

  const userRole = req.user?.role || 'customer';
  const maxRequests = limits[userRole] || 50;

  const limiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: maxRequests,
    keyGenerator: (req) => req.user?.userId?.toString() || req.ip,
  });

  limiter(req, res, next);
};

module.exports = {
  createRateLimiter,
  generalLimiter,
  authLimiter,
  registrationLimiter,
  passwordResetLimiter,
  writeLimiter,
  reportLimiter,
  downloadLimiter,
  uploadLimiter,
  userRateLimiter,
  roleBasedLimiter,
};
