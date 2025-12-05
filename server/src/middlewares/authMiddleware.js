// server/src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        code: 'NO_TOKEN',
      });
    }

    // Extract token
    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token format.',
        code: 'INVALID_TOKEN_FORMAT',
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if user still exists and is active
      const user = await User.findById(decoded.userId).select('-passwordHash');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found. Token may be invalid.',
          code: 'USER_NOT_FOUND',
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated. Please contact support.',
          code: 'ACCOUNT_INACTIVE',
        });
      }

      // Attach user to request
      req.user = {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      };

      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired. Please login again.',
          code: 'TOKEN_EXPIRED',
        });
      }

      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. Please login again.',
          code: 'INVALID_TOKEN',
        });
      }

      throw jwtError;
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error. Please try again.',
      code: 'AUTH_ERROR',
    });
  }
};

/**
 * Optional Auth Middleware
 * Attaches user to request if token is present, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-passwordHash');

      if (user && user.isActive) {
        req.user = {
          userId: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      }
    } catch (jwtError) {
      // Silently ignore JWT errors in optional auth
    }

    next();
  } catch (error) {
    next();
  }
};

/**
 * Generate JWT Token
 * @param {Object} user - User document
 * @returns {string} - JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    }
  );
};

/**
 * Refresh Token Strategy (Documentation)
 *
 * For production, implement refresh tokens as follows:
 *
 * 1. On login, generate both access token (short-lived, e.g., 15min)
 *    and refresh token (long-lived, e.g., 7 days)
 *
 * 2. Store refresh token in:
 *    - HttpOnly cookie (recommended)
 *    - Or database with user reference
 *
 * 3. Create /api/auth/refresh endpoint that:
 *    - Validates refresh token
 *    - Issues new access token
 *    - Optionally rotates refresh token
 *
 * 4. On logout:
 *    - Clear refresh token from storage
 *    - Add to blacklist if using database storage
 *
 * 5. Security considerations:
 *    - Use separate secrets for access and refresh tokens
 *    - Implement token family tracking to detect token theft
 *    - Rate limit refresh endpoint
 */

module.exports = {
  authMiddleware,
  optionalAuth,
  generateToken,
};
