// server/src/models/OTP.js
const mongoose = require('mongoose');
const crypto = require('crypto');

const otpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    phone: {
      type: String,
    },
    otp: {
      type: String,
      required: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ['login', 'password_reset', 'email_verify', 'phone_verify', 'transaction'],
      default: 'login',
    },
    channel: {
      type: String,
      enum: ['email', 'sms', 'both'],
      default: 'email',
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    usedAt: Date,
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: true,
  }
);

// Index for cleanup of expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Generate OTP
otpSchema.statics.generateOTP = function(length = 6) {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
};

// Hash OTP for storage
otpSchema.statics.hashOTP = function(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

// Create new OTP for user
otpSchema.statics.createOTP = async function(userId, email, purpose = 'login', options = {}) {
  const {
    phone = null,
    channel = 'email',
    expiryMinutes = 5,
    length = 6,
    ipAddress = null,
    userAgent = null,
  } = options;

  // Invalidate any existing unused OTPs for this user and purpose
  await this.updateMany(
    { userId, purpose, isUsed: false },
    { isUsed: true }
  );

  // Generate new OTP
  const otp = this.generateOTP(length);
  const otpHash = this.hashOTP(otp);
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  const otpDoc = await this.create({
    userId,
    email,
    phone,
    otp: otp.substring(0, 2) + '****', // Store masked version for reference
    otpHash,
    purpose,
    channel,
    expiresAt,
    ipAddress,
    userAgent,
  });

  return { otpDoc, otp }; // Return plain OTP to send to user
};

// Verify OTP
otpSchema.statics.verifyOTP = async function(userId, otp, purpose = 'login') {
  const otpHash = this.hashOTP(otp);

  const otpDoc = await this.findOne({
    userId,
    purpose,
    isUsed: false,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!otpDoc) {
    return { valid: false, error: 'OTP not found or expired' };
  }

  // Check max attempts
  if (otpDoc.attempts >= otpDoc.maxAttempts) {
    otpDoc.isUsed = true;
    await otpDoc.save();
    return { valid: false, error: 'Maximum attempts exceeded. Please request a new OTP.' };
  }

  // Increment attempts
  otpDoc.attempts += 1;

  // Verify hash
  if (otpDoc.otpHash !== otpHash) {
    await otpDoc.save();
    const remainingAttempts = otpDoc.maxAttempts - otpDoc.attempts;
    return {
      valid: false,
      error: `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`,
      remainingAttempts,
    };
  }

  // Mark as used
  otpDoc.isUsed = true;
  otpDoc.usedAt = new Date();
  await otpDoc.save();

  return { valid: true };
};

// Get recent OTP requests count (for rate limiting)
otpSchema.statics.getRecentRequestCount = async function(userId, purpose, minutes = 60) {
  const since = new Date(Date.now() - minutes * 60 * 1000);
  return this.countDocuments({
    userId,
    purpose,
    createdAt: { $gte: since },
  });
};

module.exports = mongoose.model('OTP', otpSchema);
