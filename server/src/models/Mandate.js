// server/src/models/Mandate.js
const mongoose = require('mongoose');

const mandateSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    loanAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LoanAccount',
      required: true,
      index: true,
    },
    // Bank Account Details
    accountHolderName: {
      type: String,
      required: [true, 'Account holder name is required'],
      trim: true,
    },
    bankName: {
      type: String,
      required: [true, 'Bank name is required'],
      trim: true,
    },
    accountNumber: {
      type: String,
      required: [true, 'Account number is required'],
      trim: true,
    },
    accountNumberMasked: {
      type: String,
      trim: true,
    },
    ifscCode: {
      type: String,
      required: [true, 'IFSC code is required'],
      uppercase: true,
      match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format'],
    },
    accountType: {
      type: String,
      enum: ['savings', 'current'],
      default: 'savings',
    },
    // Mandate Details
    mandateType: {
      type: String,
      enum: ['enach', 'nach', 'upi_autopay'],
      default: 'enach',
    },
    umrn: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    maxAmount: {
      type: Number,
      required: [true, 'Maximum debit amount is required'],
      min: [100, 'Minimum amount is ₹100'],
    },
    frequency: {
      type: String,
      enum: ['monthly', 'quarterly', 'half_yearly', 'yearly', 'as_presented'],
      default: 'monthly',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    debitDay: {
      type: Number,
      min: 1,
      max: 28,
      default: 5,
    },
    // Status Management
    status: {
      type: String,
      enum: ['pending', 'initiated', 'approved', 'active', 'suspended', 'cancelled', 'expired', 'rejected'],
      default: 'pending',
    },
    statusHistory: [{
      status: String,
      changedAt: { type: Date, default: Date.now },
      changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reason: String,
    }],
    // Bank Response
    bankReferenceNumber: String,
    registrationDate: Date,
    rejectionReason: String,
    // Execution Tracking
    lastDebitDate: Date,
    lastDebitAmount: Number,
    lastDebitStatus: {
      type: String,
      enum: ['success', 'failed', 'pending'],
    },
    totalDebits: {
      type: Number,
      default: 0,
    },
    totalAmountDebited: {
      type: Number,
      default: 0,
    },
    consecutiveFailures: {
      type: Number,
      default: 0,
    },
    // Customer Consent
    consentGiven: {
      type: Boolean,
      default: false,
    },
    consentTimestamp: Date,
    consentIP: String,
    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    remarks: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
mandateSchema.index({ customerId: 1, status: 1 });
mandateSchema.index({ loanAccountId: 1, status: 1 });
mandateSchema.index({ status: 1, endDate: 1 });

// Pre-save: Mask account number
mandateSchema.pre('save', function(next) {
  if (this.isModified('accountNumber') && this.accountNumber) {
    const acc = this.accountNumber;
    this.accountNumberMasked = acc.length > 4
      ? 'X'.repeat(acc.length - 4) + acc.slice(-4)
      : acc;
  }
  next();
});

// Virtual: Check if mandate is usable
mandateSchema.virtual('isUsable').get(function() {
  return this.status === 'active' && new Date() <= new Date(this.endDate);
});

// Virtual: Days until expiry
mandateSchema.virtual('daysUntilExpiry').get(function() {
  if (!this.endDate) return null;
  const diff = new Date(this.endDate) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Static: Get active mandate for loan
mandateSchema.statics.getActiveMandateForLoan = async function(loanAccountId) {
  return this.findOne({
    loanAccountId,
    status: 'active',
    endDate: { $gte: new Date() },
  });
};

// Static: Get customer mandates
mandateSchema.statics.getCustomerMandates = async function(customerId, includeInactive = false) {
  const query = { customerId };
  if (!includeInactive) {
    query.status = { $in: ['pending', 'initiated', 'approved', 'active'] };
  }
  return this.find(query)
    .populate('loanAccountId', 'accountNumber emiAmount')
    .sort({ createdAt: -1 });
};

// Method: Update status with history
mandateSchema.methods.updateStatus = async function(newStatus, userId, reason = null) {
  this.statusHistory.push({
    status: newStatus,
    changedBy: userId,
    reason,
  });
  this.status = newStatus;
  return this.save();
};

// Method: Record debit attempt
mandateSchema.methods.recordDebitAttempt = async function(amount, status) {
  this.lastDebitDate = new Date();
  this.lastDebitAmount = amount;
  this.lastDebitStatus = status;

  if (status === 'success') {
    this.totalDebits += 1;
    this.totalAmountDebited += amount;
    this.consecutiveFailures = 0;
  } else if (status === 'failed') {
    this.consecutiveFailures += 1;
    // Auto-suspend after 3 consecutive failures
    if (this.consecutiveFailures >= 3 && this.status === 'active') {
      this.status = 'suspended';
      this.statusHistory.push({
        status: 'suspended',
        reason: 'Auto-suspended after 3 consecutive debit failures',
      });
    }
  }

  return this.save();
};

module.exports = mongoose.model('Mandate', mandateSchema);
