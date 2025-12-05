// server/src/routes/auth.js
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  register,
  login,
  getMe,
  updatePassword,
  updateProfile,
  createUser,
  getUsers,
  toggleUserStatus,
  verifyOTP,
  resendOTP,
  get2FAStatus,
  enable2FA,
  confirm2FA,
  disable2FA,
} = require('../controllers/authController');

const { authMiddleware } = require('../middlewares/authMiddleware');
const { adminOnly } = require('../middlewares/roleMiddleware');
const { authLimiter, registrationLimiter } = require('../middlewares/rateLimit');

// Validation rules
const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase and number'),
  body('phone')
    .optional()
    .matches(/^[6-9]\d{9}$/).withMessage('Invalid phone number'),
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
];

const passwordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase and number'),
];

const createUserValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/).withMessage('Password must contain uppercase, lowercase, number and special character'),
  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(['admin', 'officer']).withMessage('Role must be admin or officer'),
];

// Public routes
router.post('/register', registrationLimiter, registerValidation, register);
router.post('/login', authLimiter, loginValidation, login);

// 2FA public routes (used during login)
router.post('/verify-otp', authLimiter, verifyOTP);
router.post('/resend-otp', authLimiter, resendOTP);

// Protected routes
router.get('/me', authMiddleware, getMe);
router.put('/password', authMiddleware, passwordValidation, updatePassword);
router.put('/profile', authMiddleware, updateProfile);

// 2FA management routes
router.get('/2fa/status', authMiddleware, get2FAStatus);
router.post('/2fa/enable', authMiddleware, enable2FA);
router.post('/2fa/confirm', authMiddleware, confirm2FA);
router.post('/2fa/disable', authMiddleware, disable2FA);

// Admin routes
router.post('/users', authMiddleware, adminOnly, createUserValidation, createUser);
router.get('/users', authMiddleware, adminOnly, getUsers);
router.patch('/users/:id/toggle-status', authMiddleware, adminOnly, toggleUserStatus);

module.exports = router;
