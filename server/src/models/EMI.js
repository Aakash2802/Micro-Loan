// server/src/models/EMI.js
const mongoose = require('mongoose');

/**
 * Payment Record Sub-Schema
 * Stores individual payment transaction details
 */
const paymentRecordSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    mode: {
      type: String,
      enum: ['cash', 'cheque', 'bank_transfer', 'upi', 'card', 'auto_debit', 'online'],
      required: true,
    },
    referenceNumber: {
      type: String,
      trim: true,
    },
    remarks: String,
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

/**
 * EMI Schema
 * Represents individual EMI installments for a loan account
 */
const emiSchema = new mongoose.Schema(
  {
    loanAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LoanAccount',
      required: [true, 'Loan account is required'],
      index: true,
    },
    // EMI sequence number (1, 2, 3, ...)
    sequence: {
      type: Number,
      required: [true, 'EMI sequence is required'],
      min: [1, 'Sequence must be at least 1'],
    },
    // EMI Schedule
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    // EMI Amount Breakdown
    amount: {
      type: Number,
      required: [true, 'EMI amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    principalComponent: {
      type: Number,
      required: true,
      min: [0, 'Principal component cannot be negative'],
    },
    interestComponent: {
      type: Number,
      required: true,
      min: [0, 'Interest component cannot be negative'],
    },
    // Balance after this EMI (if paid on time)
    openingBalance: {
      type: Number,
      required: true,
    },
    closingBalance: {
      type: Number,
      required: true,
    },
    // Payment Status
    status: {
      type: String,
      enum: ['pending', 'paid', 'partial', 'overdue', 'waived'],
      default: 'pending',
    },
    // Payment Details
    paidAmount: {
      type: Number,
      default: 0,
    },
    paidDate: {
      type: Date,
    },
    paymentMode: {
      type: String,
      enum: ['cash', 'cheque', 'bank_transfer', 'upi', 'card', 'auto_debit', 'online'],
    },
    paymentReference: {
      type: String,
      trim: true,
    },
    // Penalty Tracking
    daysLate: {
      type: Number,
      default: 0,
    },
    penaltyAmount: {
      type: Number,
      default: 0,
    },
    penaltyPaid: {
      type: Number,
      default: 0,
    },
    penaltyWaived: {
      type: Number,
      default: 0,
    },
    // Total amount due including penalty
    totalDue: {
      type: Number,
      default: function () {
        return this.amount;
      },
    },
    // Partial payment tracking
    balanceDue: {
      type: Number,
      default: function () {
        return this.amount;
      },
    },
    // Multiple payment records (for partial payments)
    payments: [paymentRecordSchema],
    // Waiver details
    waiverAmount: {
      type: Number,
      default: 0,
    },
    waiverReason: String,
    waivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Reminder tracking
    remindersSent: {
      type: Number,
      default: 0,
    },
    lastReminderDate: Date,
    // Metadata
    remarks: String,
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for unique EMI per loan
emiSchema.index({ loanAccountId: 1, sequence: 1 }, { unique: true });
emiSchema.index({ dueDate: 1, status: 1 });
emiSchema.index({ status: 1 });

// Virtual for checking if overdue
emiSchema.virtual('isOverdue').get(function () {
  if (this.status === 'paid') return false;
  return new Date() > new Date(this.dueDate);
});

// Virtual for days until due / days overdue
emiSchema.virtual('daysDiff').get(function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(this.dueDate);
  dueDate.setHours(0, 0, 0, 0);
  const diffTime = dueDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for status display
emiSchema.virtual('statusDisplay').get(function () {
  const statusMap = {
    pending: 'Pending',
    paid: 'Paid',
    partial: 'Partially Paid',
    overdue: 'Overdue',
    waived: 'Waived',
  };
  return statusMap[this.status] || this.status;
});

/**
 * Pre-save middleware to update status
 */
emiSchema.pre('save', function (next) {
  // Auto-mark as overdue if past due date and not paid
  if (this.status === 'pending' && new Date() > new Date(this.dueDate)) {
    this.status = 'overdue';
  }

  // Calculate total due with penalty
  this.totalDue = this.amount + this.penaltyAmount - this.penaltyWaived - this.waiverAmount;

  // Calculate balance due
  this.balanceDue = this.totalDue - this.paidAmount;

  // Update status based on payment
  if (this.paidAmount >= this.totalDue) {
    this.status = 'paid';
    this.balanceDue = 0;
  } else if (this.paidAmount > 0 && this.paidAmount < this.totalDue) {
    this.status = 'partial';
  }

  next();
});

/**
 * Calculate days late for payment
 * @param {Date} paymentDate - Date of payment
 * @returns {number} - Days late (0 if on time)
 */
emiSchema.methods.calculateDaysLate = function (paymentDate) {
  const dueDate = new Date(this.dueDate);
  dueDate.setHours(23, 59, 59, 999);
  const paidDate = new Date(paymentDate);

  if (paidDate <= dueDate) return 0;

  const diffTime = paidDate - dueDate;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Record a payment for this EMI
 * @param {Object} paymentDetails - Payment details
 * @returns {Object} - Payment result
 */
emiSchema.methods.recordPayment = async function (paymentDetails) {
  const {
    amount,
    date,
    mode,
    referenceNumber,
    remarks,
    recordedBy,
    penaltyAmount = 0,
  } = paymentDetails;

  // Prevent double payment
  if (this.status === 'paid') {
    throw new Error('This EMI has already been paid');
  }

  // Calculate days late
  const daysLate = this.calculateDaysLate(date);
  this.daysLate = daysLate;

  // Update penalty if provided
  if (penaltyAmount > 0) {
    this.penaltyAmount = penaltyAmount;
    this.totalDue = this.amount + penaltyAmount;
  }

  // Create payment record
  const paymentRecord = {
    amount,
    date,
    mode,
    referenceNumber,
    remarks,
    recordedBy,
    recordedAt: new Date(),
  };

  this.payments.push(paymentRecord);
  this.paidAmount += amount;
  this.paidDate = date;
  this.paymentMode = mode;
  this.paymentReference = referenceNumber;
  this.recordedBy = recordedBy;

  // Update status
  if (this.paidAmount >= this.totalDue) {
    this.status = 'paid';
    this.balanceDue = 0;
  } else {
    this.status = 'partial';
    this.balanceDue = this.totalDue - this.paidAmount;
  }

  await this.save();

  return {
    success: true,
    emiId: this._id,
    sequence: this.sequence,
    status: this.status,
    paidAmount: this.paidAmount,
    balanceDue: this.balanceDue,
    daysLate: this.daysLate,
    penaltyAmount: this.penaltyAmount,
  };
};

/**
 * Static method to find overdue EMIs
 */
emiSchema.statics.findOverdue = function () {
  return this.find({
    status: { $in: ['pending', 'partial'] },
    dueDate: { $lt: new Date() },
  })
    .populate('loanAccountId', 'accountNumber customerId')
    .sort({ dueDate: 1 });
};

/**
 * Static method to find upcoming EMIs
 * @param {number} days - Days to look ahead
 */
emiSchema.statics.findUpcoming = function (days = 7) {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return this.find({
    status: 'pending',
    dueDate: {
      $gte: today,
      $lte: futureDate,
    },
  })
    .populate('loanAccountId', 'accountNumber customerId')
    .sort({ dueDate: 1 });
};

/**
 * Update all pending EMIs to overdue status (for scheduled job)
 */
emiSchema.statics.markOverdueEMIs = async function () {
  const result = await this.updateMany(
    {
      status: 'pending',
      dueDate: { $lt: new Date() },
    },
    {
      $set: { status: 'overdue' },
    }
  );
  return result.modifiedCount;
};

const EMI = mongoose.model('EMI', emiSchema);

module.exports = EMI;
