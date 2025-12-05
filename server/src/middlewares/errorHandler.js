// server/src/middlewares/errorHandler.js

/**
 * Custom API Error Class
 * Extends Error with additional properties for API responses
 */
class APIError extends Error {
  constructor(message, statusCode = 500, code = 'ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Common error types
 */
const ErrorTypes = {
  BAD_REQUEST: (message = 'Bad request') => new APIError(message, 400, 'BAD_REQUEST'),
  UNAUTHORIZED: (message = 'Unauthorized') => new APIError(message, 401, 'UNAUTHORIZED'),
  FORBIDDEN: (message = 'Forbidden') => new APIError(message, 403, 'FORBIDDEN'),
  NOT_FOUND: (message = 'Resource not found') => new APIError(message, 404, 'NOT_FOUND'),
  CONFLICT: (message = 'Conflict') => new APIError(message, 409, 'CONFLICT'),
  VALIDATION: (message = 'Validation error') => new APIError(message, 422, 'VALIDATION_ERROR'),
  INTERNAL: (message = 'Internal server error') => new APIError(message, 500, 'INTERNAL_ERROR'),
};

/**
 * Handle Mongoose CastError (invalid ObjectId)
 */
const handleCastError = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new APIError(message, 400, 'INVALID_ID');
};

/**
 * Handle Mongoose Duplicate Key Error
 */
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `Duplicate value for field '${field}': ${value}. Please use another value.`;
  return new APIError(message, 409, 'DUPLICATE_KEY');
};

/**
 * Handle Mongoose Validation Error
 */
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map((el) => ({
    field: el.path,
    message: el.message,
    value: el.value,
  }));
  const message = 'Validation failed';
  const error = new APIError(message, 422, 'VALIDATION_ERROR');
  error.errors = errors;
  return error;
};

/**
 * Handle JWT Errors
 */
const handleJWTError = () => {
  return new APIError('Invalid token. Please log in again.', 401, 'INVALID_TOKEN');
};

const handleJWTExpiredError = () => {
  return new APIError('Your token has expired. Please log in again.', 401, 'TOKEN_EXPIRED');
};

/**
 * Send error response in development mode
 * Includes full error details and stack trace
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message,
    code: err.code || 'ERROR',
    error: err,
    stack: err.stack,
    ...(err.errors && { errors: err.errors }),
  });
};

/**
 * Send error response in production mode
 * Only includes safe information
 */
const sendErrorProd = (err, res) => {
  // Operational errors: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      ...(err.errors && { errors: err.errors }),
    });
  } else {
    // Programming or unknown errors: don't leak details
    console.error('ERROR 💥:', err);

    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.',
      code: 'INTERNAL_ERROR',
    });
  }
};

/**
 * Global Error Handler Middleware
 * Catches all errors passed to next(error)
 */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;

  // Log error for debugging
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  }

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    // Create a copy of the error
    let error = { ...err, message: err.message, name: err.name };

    // Handle specific error types
    if (err.name === 'CastError') error = handleCastError(err);
    if (err.code === 11000) error = handleDuplicateKeyError(err);
    if (err.name === 'ValidationError') error = handleValidationError(err);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};

/**
 * Async handler wrapper
 * Catches async errors and passes them to error handler
 *
 * Usage:
 *   router.get('/route', asyncHandler(async (req, res) => { ... }));
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found Handler
 * Catches requests to undefined routes
 */
const notFoundHandler = (req, res, next) => {
  const error = new APIError(
    `Route ${req.originalUrl} not found`,
    404,
    'ROUTE_NOT_FOUND'
  );
  next(error);
};

/**
 * Validation Error Helper
 * Creates validation error from express-validator results
 */
const createValidationError = (errors) => {
  const error = new APIError('Validation failed', 422, 'VALIDATION_ERROR');
  error.errors = errors.array().map((err) => ({
    field: err.path || err.param,
    message: err.msg,
    value: err.value,
  }));
  return error;
};

module.exports = {
  APIError,
  ErrorTypes,
  errorHandler,
  asyncHandler,
  notFoundHandler,
  createValidationError,
};
