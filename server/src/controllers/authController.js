// server/src/controllers/authController.js
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Customer = require('../models/Customer');
const AuditLog = require('../models/AuditLog');
const OTP = require('../models/OTP');
const { generateToken } = require('../middlewares/authMiddleware');
const { asyncHandler, APIError, createValidationError } = require('../middlewares/errorHandler');

// Generate a temporary token for 2FA flow (short-lived)
const generateTempToken = (user) => {
  return jwt.sign(
    { userId: user._id, temp: true, purpose: '2fa' },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
};

/**
 * @desc    Register a new user (customer)
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError(errors);
  }

  const { name, email, password, phone } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new APIError('Email is already registered', 409, 'EMAIL_EXISTS');
  }

  // Create user
  const user = new User({
    name,
    email: email.toLowerCase(),
    passwordHash: password,
    role: 'customer',
  });
  await user.save();

  // Create basic customer profile
  const customer = new Customer({
    userId: user._id,
    fullName: name,
    phone: phone || '',
    email: email.toLowerCase(),
    dob: new Date('2000-01-01'), // Placeholder, to be updated
    gender: 'other',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
    },
    employmentType: 'salaried',
    monthlyIncome: 0,
    kycStatus: 'pending',
  });
  await customer.save();

  // Generate token
  const token = generateToken(user);

  // Log registration
  await AuditLog.logAuth('auth_register', user._id, { email }, req);

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      customerId: customer._id,
      token,
    },
  });
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError(errors);
  }

  const { email, password } = req.body;

  // Find user with password field
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

  if (!user) {
    await AuditLog.logAuth('auth_failed_login', null, { email, reason: 'User not found' }, req);
    throw new APIError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Check if account is active
  if (!user.isActive) {
    await AuditLog.logAuth('auth_failed_login', user._id, { reason: 'Account inactive' }, req);
    throw new APIError('Account is deactivated. Please contact support.', 401, 'ACCOUNT_INACTIVE');
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    await AuditLog.logAuth('auth_failed_login', user._id, { reason: 'Wrong password' }, req);
    throw new APIError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Check if 2FA is enabled
  if (user.twoFactorEnabled) {
    // Rate limit OTP requests
    const recentOTPs = await OTP.getRecentRequestCount(user._id, 'login', 15);
    if (recentOTPs >= 5) {
      throw new APIError('Too many OTP requests. Please try again later.', 429, 'TOO_MANY_REQUESTS');
    }

    // Generate and send OTP
    const { otp } = await OTP.createOTP(user._id, user.email, 'login', {
      phone: user.twoFactorPhone,
      channel: user.twoFactorMethod,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // TODO: In production, send OTP via email/SMS service
    // OTP is sent via the OTP.createOTP method which handles email sending

    // Generate temporary token for 2FA verification
    const tempToken = generateTempToken(user);

    await AuditLog.logAuth('auth_2fa_initiated', user._id, { method: user.twoFactorMethod }, req);

    return res.json({
      success: true,
      message: 'OTP sent to your registered ' + (user.twoFactorMethod === 'sms' ? 'phone' : 'email'),
      data: {
        requires2FA: true,
        tempToken,
        method: user.twoFactorMethod,
        maskedEmail: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
      },
    });
  }

  // No 2FA - proceed with normal login
  await user.updateLastLogin();

  // Generate token
  const token = generateToken(user);

  // Get customer profile if role is customer
  let customerId = null;
  if (user.role === 'customer') {
    const customer = await Customer.findOne({ userId: user._id });
    customerId = customer?._id;
  }

  // Log successful login
  await AuditLog.logAuth('auth_login', user._id, { email }, req);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin,
        twoFactorEnabled: user.twoFactorEnabled,
      },
      customerId,
      token,
    },
  });
});

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);

  if (!user) {
    throw new APIError('User not found', 404, 'USER_NOT_FOUND');
  }

  let customerProfile = null;
  if (user.role === 'customer') {
    customerProfile = await Customer.findOne({ userId: user._id });
  }

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
      customer: customerProfile,
    },
  });
});

/**
 * @desc    Update user password
 * @route   PUT /api/auth/password
 * @access  Private
 */
const updatePassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError(errors);
  }

  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.user.userId).select('+passwordHash');

  if (!user) {
    throw new APIError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Verify current password
  const isPasswordValid = await user.comparePassword(currentPassword);
  if (!isPasswordValid) {
    throw new APIError('Current password is incorrect', 400, 'WRONG_PASSWORD');
  }

  // Update password
  user.passwordHash = newPassword;
  await user.save();

  // Generate new token
  const token = generateToken(user);

  // Log password change
  await AuditLog.logAuth('auth_password_reset', user._id, { method: 'self_change' }, req);

  res.json({
    success: true,
    message: 'Password updated successfully',
    data: { token },
  });
});

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name } = req.body;

  const user = await User.findById(req.user.userId);

  if (!user) {
    throw new APIError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Update fields
  if (name) user.name = name;
  await user.save();

  // If customer, also update customer profile
  if (user.role === 'customer') {
    await Customer.findOneAndUpdate(
      { userId: user._id },
      { fullName: name },
      { new: true }
    );
  }

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
  });
});

/**
 * @desc    Admin: Create new user (admin/officer)
 * @route   POST /api/auth/users
 * @access  Private/Admin
 */
const createUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError(errors);
  }

  const { name, email, password, role } = req.body;

  // Only admin can create admin/officer accounts
  if (!['admin', 'officer'].includes(role)) {
    throw new APIError('Invalid role. Use /register for customer accounts.', 400, 'INVALID_ROLE');
  }

  // Check if email exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new APIError('Email is already registered', 409, 'EMAIL_EXISTS');
  }

  // Create user
  const user = new User({
    name,
    email: email.toLowerCase(),
    passwordHash: password,
    role,
  });
  await user.save();

  res.status(201).json({
    success: true,
    message: `${role} account created successfully`,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
  });
});

/**
 * @desc    Admin: Get all users
 * @route   GET /api/auth/users
 * @access  Private/Admin
 */
const getUsers = asyncHandler(async (req, res) => {
  const { role, page = 1, limit = 20 } = req.query;

  const query = {};
  if (role) query.role = role;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [users, total] = await Promise.all([
    User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    User.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

/**
 * @desc    Admin: Toggle user active status
 * @route   PATCH /api/auth/users/:id/toggle-status
 * @access  Private/Admin
 */
const toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new APIError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Prevent self-deactivation
  if (user._id.toString() === req.user.userId.toString()) {
    throw new APIError('Cannot deactivate your own account', 400, 'SELF_DEACTIVATION');
  }

  user.isActive = !user.isActive;
  await user.save();

  res.json({
    success: true,
    message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
      },
    },
  });
});

/**
 * @desc    Verify OTP and complete 2FA login
 * @route   POST /api/auth/verify-otp
 * @access  Public (with temp token)
 */
const verifyOTP = asyncHandler(async (req, res) => {
  const { tempToken, otp } = req.body;

  if (!tempToken || !otp) {
    throw new APIError('Token and OTP are required', 400, 'MISSING_FIELDS');
  }

  // Verify temp token
  let decoded;
  try {
    decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    if (!decoded.temp || decoded.purpose !== '2fa') {
      throw new Error('Invalid token');
    }
  } catch (error) {
    throw new APIError('Invalid or expired verification session', 401, 'INVALID_SESSION');
  }

  // Get user
  const user = await User.findById(decoded.userId);
  if (!user) {
    throw new APIError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Verify OTP
  const verification = await OTP.verifyOTP(user._id, otp, 'login');
  if (!verification.valid) {
    await AuditLog.logAuth('auth_2fa_failed', user._id, { error: verification.error }, req);
    throw new APIError(verification.error, 401, 'INVALID_OTP');
  }

  // OTP verified - complete login
  await user.updateLastLogin();

  // Generate full token
  const token = generateToken(user);

  // Get customer profile if role is customer
  let customerId = null;
  if (user.role === 'customer') {
    const customer = await Customer.findOne({ userId: user._id });
    customerId = customer?._id;
  }

  // Log successful 2FA login
  await AuditLog.logAuth('auth_2fa_login', user._id, { method: user.twoFactorMethod }, req);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin,
        twoFactorEnabled: user.twoFactorEnabled,
      },
      customerId,
      token,
    },
  });
});

/**
 * @desc    Resend OTP
 * @route   POST /api/auth/resend-otp
 * @access  Public (with temp token)
 */
const resendOTP = asyncHandler(async (req, res) => {
  const { tempToken } = req.body;

  if (!tempToken) {
    throw new APIError('Verification token is required', 400, 'MISSING_TOKEN');
  }

  // Verify temp token
  let decoded;
  try {
    decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    if (!decoded.temp || decoded.purpose !== '2fa') {
      throw new Error('Invalid token');
    }
  } catch (error) {
    throw new APIError('Invalid or expired verification session', 401, 'INVALID_SESSION');
  }

  // Get user
  const user = await User.findById(decoded.userId);
  if (!user) {
    throw new APIError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Rate limit
  const recentOTPs = await OTP.getRecentRequestCount(user._id, 'login', 15);
  if (recentOTPs >= 5) {
    throw new APIError('Too many OTP requests. Please try again later.', 429, 'TOO_MANY_REQUESTS');
  }

  // Generate new OTP
  const { otp } = await OTP.createOTP(user._id, user.email, 'login', {
    phone: user.twoFactorPhone,
    channel: user.twoFactorMethod,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // TODO: In production, send OTP via email/SMS service

  // Generate new temp token (refresh expiry)
  const newTempToken = generateTempToken(user);

  res.json({
    success: true,
    message: 'OTP resent successfully',
    data: {
      tempToken: newTempToken,
      method: user.twoFactorMethod,
    },
  });
});

/**
 * @desc    Get 2FA status
 * @route   GET /api/auth/2fa/status
 * @access  Private
 */
const get2FAStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);

  if (!user) {
    throw new APIError('User not found', 404, 'USER_NOT_FOUND');
  }

  res.json({
    success: true,
    data: {
      enabled: user.twoFactorEnabled,
      method: user.twoFactorMethod,
      phone: user.twoFactorPhone ? user.twoFactorPhone.replace(/(\d{2})\d+(\d{4})/, '$1****$2') : null,
      enabledAt: user.twoFactorEnabledAt,
    },
  });
});

/**
 * @desc    Enable 2FA
 * @route   POST /api/auth/2fa/enable
 * @access  Private
 */
const enable2FA = asyncHandler(async (req, res) => {
  const { method = 'email', phone } = req.body;

  const user = await User.findById(req.user.userId);

  if (!user) {
    throw new APIError('User not found', 404, 'USER_NOT_FOUND');
  }

  if (user.twoFactorEnabled) {
    throw new APIError('2FA is already enabled', 400, '2FA_ALREADY_ENABLED');
  }

  // If SMS method, require phone number
  if (method === 'sms' && !phone) {
    throw new APIError('Phone number is required for SMS authentication', 400, 'PHONE_REQUIRED');
  }

  // Send verification OTP
  const { otp } = await OTP.createOTP(user._id, user.email, 'login', {
    phone: phone || user.twoFactorPhone,
    channel: method,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // TODO: In production, send OTP via email/SMS service

  // Store pending 2FA settings
  user.twoFactorMethod = method;
  if (phone) user.twoFactorPhone = phone;
  await user.save();

  res.json({
    success: true,
    message: 'Verification OTP sent. Please verify to enable 2FA.',
    data: {
      method,
      maskedEmail: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
    },
  });
});

/**
 * @desc    Confirm 2FA enable with OTP
 * @route   POST /api/auth/2fa/confirm
 * @access  Private
 */
const confirm2FA = asyncHandler(async (req, res) => {
  const { otp } = req.body;

  if (!otp) {
    throw new APIError('OTP is required', 400, 'OTP_REQUIRED');
  }

  const user = await User.findById(req.user.userId);

  if (!user) {
    throw new APIError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Verify OTP
  const verification = await OTP.verifyOTP(user._id, otp, 'login');
  if (!verification.valid) {
    throw new APIError(verification.error, 401, 'INVALID_OTP');
  }

  // Enable 2FA
  user.twoFactorEnabled = true;
  user.twoFactorEnabledAt = new Date();
  await user.save();

  await AuditLog.logAuth('auth_2fa_enabled', user._id, { method: user.twoFactorMethod }, req);

  res.json({
    success: true,
    message: 'Two-factor authentication enabled successfully',
    data: {
      enabled: true,
      method: user.twoFactorMethod,
    },
  });
});

/**
 * @desc    Disable 2FA
 * @route   POST /api/auth/2fa/disable
 * @access  Private
 */
const disable2FA = asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    throw new APIError('Password is required to disable 2FA', 400, 'PASSWORD_REQUIRED');
  }

  const user = await User.findById(req.user.userId).select('+passwordHash');

  if (!user) {
    throw new APIError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new APIError('Invalid password', 401, 'INVALID_PASSWORD');
  }

  // Disable 2FA
  user.twoFactorEnabled = false;
  user.twoFactorEnabledAt = null;
  await user.save();

  await AuditLog.logAuth('auth_2fa_disabled', user._id, {}, req);

  res.json({
    success: true,
    message: 'Two-factor authentication disabled',
  });
});

module.exports = {
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
};
