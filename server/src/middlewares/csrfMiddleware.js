// server/src/middlewares/csrfMiddleware.js
const crypto = require('crypto');

// Store for CSRF tokens (in production, use Redis or similar)
const tokenStore = new Map();

// Token expiry time (1 hour)
const TOKEN_EXPIRY = 60 * 60 * 1000;

/**
 * Generate a CSRF token for a session
 */
const generateCSRFToken = (sessionId) => {
  const token = crypto.randomBytes(32).toString('hex');
  tokenStore.set(token, {
    sessionId,
    createdAt: Date.now(),
  });
  return token;
};

/**
 * Validate a CSRF token
 */
const validateCSRFToken = (token, sessionId) => {
  const stored = tokenStore.get(token);
  if (!stored) {
    return false;
  }

  // Check expiry
  if (Date.now() - stored.createdAt > TOKEN_EXPIRY) {
    tokenStore.delete(token);
    return false;
  }

  // In strict mode, also verify session matches
  // For API-based apps, we just verify the token exists
  return true;
};

/**
 * Clean up expired tokens (run periodically)
 */
const cleanupTokens = () => {
  const now = Date.now();
  for (const [token, data] of tokenStore.entries()) {
    if (now - data.createdAt > TOKEN_EXPIRY) {
      tokenStore.delete(token);
    }
  }
};

// Clean up every 10 minutes
setInterval(cleanupTokens, 10 * 60 * 1000);

/**
 * Middleware to generate and set CSRF token
 */
const csrfTokenGenerator = (req, res, next) => {
  // Generate session ID from user or create anonymous one
  const sessionId = req.user?.userId || req.ip;
  const token = generateCSRFToken(sessionId);

  // Set token in response header
  res.setHeader('X-CSRF-Token', token);

  // Also make it available for the response
  req.csrfToken = token;

  next();
};

/**
 * Middleware to validate CSRF token on state-changing requests
 */
const csrfProtection = (req, res, next) => {
  // Skip CSRF check for GET, HEAD, OPTIONS requests
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Get token from header or body
  const token = req.headers['x-csrf-token'] || req.body._csrf;

  if (!token) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token missing',
      code: 'CSRF_MISSING',
    });
  }

  const sessionId = req.user?.userId || req.ip;
  if (!validateCSRFToken(token, sessionId)) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired CSRF token',
      code: 'CSRF_INVALID',
    });
  }

  // Token is valid, remove it (single use)
  tokenStore.delete(token);

  next();
};

/**
 * Double-submit cookie pattern (alternative approach)
 * This is useful for SPAs where cookies can be set
 */
const doubleSubmitCookie = (req, res, next) => {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];

  if (safeMethods.includes(req.method)) {
    // Generate and set cookie for safe methods
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie('XSRF-TOKEN', token, {
      httpOnly: false, // Must be readable by JS
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000, // 1 hour
    });
    return next();
  }

  // For state-changing methods, verify the token
  const cookieToken = req.cookies?.['XSRF-TOKEN'];
  const headerToken = req.headers['x-xsrf-token'];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({
      success: false,
      message: 'CSRF validation failed',
      code: 'CSRF_MISMATCH',
    });
  }

  next();
};

/**
 * Simple origin/referer check (basic CSRF protection)
 * Works well with SameSite cookies
 */
const originCheck = (req, res, next) => {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const host = req.headers.host;
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    `http://localhost:${process.env.PORT || 5000}`,
    'http://localhost:5173',
    'http://localhost:3000',
  ].filter(Boolean);

  // Check origin header
  if (origin) {
    if (!allowedOrigins.some(allowed => origin.startsWith(allowed.replace(/\/$/, '')))) {
      return res.status(403).json({
        success: false,
        message: 'Request origin not allowed',
        code: 'ORIGIN_FORBIDDEN',
      });
    }
    return next();
  }

  // Fallback to referer check
  if (referer) {
    const refererUrl = new URL(referer);
    if (!allowedOrigins.some(allowed => referer.startsWith(allowed.replace(/\/$/, '')))) {
      return res.status(403).json({
        success: false,
        message: 'Request referer not allowed',
        code: 'REFERER_FORBIDDEN',
      });
    }
    return next();
  }

  // If no origin or referer, be cautious
  // In production, you might want to reject these
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      message: 'Origin header required',
      code: 'NO_ORIGIN',
    });
  }

  next();
};

module.exports = {
  csrfTokenGenerator,
  csrfProtection,
  doubleSubmitCookie,
  originCheck,
  generateCSRFToken,
  validateCSRFToken,
};
