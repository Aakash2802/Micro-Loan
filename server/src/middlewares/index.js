// server/src/middlewares/index.js
// Central export for all middlewares

const { authMiddleware, optionalAuth, generateToken } = require('./authMiddleware');
const {
  restrictTo,
  adminOnly,
  staffOnly,
  customerOnly,
  isOwnerOrStaff,
  hasPermission,
  isOwnCustomerData,
} = require('./roleMiddleware');
const {
  APIError,
  ErrorTypes,
  errorHandler,
  asyncHandler,
  notFoundHandler,
  createValidationError,
} = require('./errorHandler');
const {
  generalLimiter,
  authLimiter,
  registrationLimiter,
  passwordResetLimiter,
  writeLimiter,
  reportLimiter,
  downloadLimiter,
  userRateLimiter,
  roleBasedLimiter,
} = require('./rateLimit');

module.exports = {
  // Auth
  authMiddleware,
  optionalAuth,
  generateToken,

  // Role-based
  restrictTo,
  adminOnly,
  staffOnly,
  customerOnly,
  isOwnerOrStaff,
  hasPermission,
  isOwnCustomerData,

  // Error handling
  APIError,
  ErrorTypes,
  errorHandler,
  asyncHandler,
  notFoundHandler,
  createValidationError,

  // Rate limiting
  generalLimiter,
  authLimiter,
  registrationLimiter,
  passwordResetLimiter,
  writeLimiter,
  reportLimiter,
  downloadLimiter,
  userRateLimiter,
  roleBasedLimiter,
};
