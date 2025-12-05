// server/src/models/LoanAccount.js
const mongoose = require('mongoose');

/**
 * Disbursement Details Sub-Schema
 * Records loan disbursement information
 */
const disbursementSchema = new mongoose.Schema(
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
      enum: ['bank_transfer', 'cheque', 'cash', 'upi'],
      required: true,
    },
    referenceNumber: {
      type: String,
      trim: true,
    },
    bankName: String,
    accountNumber: String,
    remarks: String,
    disbursedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { _id: true }
);

/**
 * Loan Account Schema
 * Represents an individual loan issued to a customer
 */
const loanAccountSchema = new mongoose.Schema(
  {
    // Auto-generated loan account number
    accountNumber: {
      type: String,
      unique: true,
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer is required'],
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LoanProduct',
      required: [true, 'Loan product is required'],
    },
    // Loan Terms (copied from product at creation, can be customized)
    principal: {
      type: Number,
      required: [true, 'Principal amount is required'],
      min: [1000, 'Minimum loan amount is ₹1,000'],
    },
    interestRate: {
      type: Number,
      required: [true, 'Interest rate is required'],
      min: [0, 'Interest rate cannot be negative'],
    },
    interestType: {
      type: String,
      enum: ['reducing', 'flat'],
      default: 'reducing',
    },
    tenureMonths: {
      type: Number,
      required: [true, 'Tenure is required'],
      min: [1, 'Tenure must be at least 1 month'],
    },
    // Calculated EMI amount
    emiAmount: {
      type: Number,
      required: true,
    },
    totalEMIs: {
      type: Number,
      required: true,
    },
    // Dates
    applicationDate: {
      type: Date,
      default: Date.now,
    },
    approvalDate: {
      type: Date,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
    },
    firstEmiDate: {
      type: Date,
    },
    // Financial Summary
    totalInterest: {
      type: Number,
      default: 0,
    },
    totalPayable: {
      type: Number,
      default: 0,
    },
    processingFee: {
      type: Number,
      default: 0,
    },
    disbursedAmount: {
      type: Number,
      default: 0, // Principal - Processing Fee
    },
    // Payment Tracking
    paidEMIs: {
      type: Number,
      default: 0,
    },
    unpaidEMIs: {
      type: Number,
      default: function () {
        return this.totalEMIs;
      },
    },
    overdueEMIs: {
      type: Number,
      default: 0,
    },
    totalPaid: {
      type: Number,
      default: 0,
    },
    totalPenalty: {
      type: Number,
      default: 0,
    },
    outstandingPrincipal: {
      type: Number,
      default: function () {
        return this.principal;
      },
    },
    outstandingInterest: {
      type: Number,
      default: 0,
    },
    outstandingAmount: {
      type: Number,
      default: function () {
        return this.totalPayable;
      },
    },
    // Next EMI Tracking
    nextDueDate: {
      type: Date,
    },
    nextEmiAmount: {
      type: Number,
    },
    nextEmiSequence: {
      type: Number,
      default: 1,
    },
    // Loan Status
    status: {
      type: String,
      enum: [
        'pending',      // Application submitted, awaiting approval
        'approved',     // Approved, awaiting disbursement
        'disbursed',    // Loan disbursed, EMI not yet started
        'active',       // EMI payments ongoing
        'overdue',      // Has overdue EMIs
        'npa',          // Non-performing asset (90+ days overdue)
        'closed',       // Fully paid
        'foreclosed',   // Prepaid/Closed early
        'defaulted',    // Written off
        'rejected',     // Application rejected
        'cancelled',    // Cancelled before disbursement
      ],
      default: 'pending',
    },
    // Risk Assessment
    riskScore: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    riskCategory: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    // Disbursement Details
    disbursement: disbursementSchema,
    // Approval Details
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvalRemarks: String,
    rejectionReason: String,
    // Closure Details
    closureDate: Date,
    closureType: {
      type: String,
      enum: ['regular', 'foreclosure', 'settlement', 'write_off'],
    },
    closureRemarks: String,
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Metadata
    purpose: {
      type: String,
      trim: true,
    },
    collateral: {
      type: String,
      trim: true,
    },
    guarantorName: String,
    guarantorPhone: String,
    notes: String,
    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
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

// Indexes for efficient queries (accountNumber index not needed - unique:true creates it)
loanAccountSchema.index({ customerId: 1, status: 1 });
loanAccountSchema.index({ status: 1 });
loanAccountSchema.index({ nextDueDate: 1 });
loanAccountSchema.index({ createdAt: -1 });

// Virtual for EMI collection
loanAccountSchema.virtual('emis', {
  ref: 'EMI',
  localField: '_id',
  foreignField: 'loanAccountId',
  options: { sort: { sequence: 1 } },
});

// Virtual for completion percentage
loanAccountSchema.virtual('completionPercentage').get(function () {
  if (this.totalEMIs === 0) return 0;
  return Math.round((this.paidEMIs / this.totalEMIs) * 100);
});

// Virtual for days overdue
loanAccountSchema.virtual('daysOverdue').get(function () {
  if (!this.nextDueDate || this.status === 'closed') return 0;
  const today = new Date();
  const dueDate = new Date(this.nextDueDate);
  if (today <= dueDate) return 0;
  const diffTime = today - dueDate;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
});

/**
 * Pre-save middleware to calculate end date
 */
loanAccountSchema.pre('save', function (next) {
  if (this.isModified('startDate') || this.isModified('tenureMonths')) {
    const endDate = new Date(this.startDate);
    endDate.setMonth(endDate.getMonth() + this.tenureMonths);
    this.endDate = endDate;
  }

  // Update risk category based on risk score
  if (this.isModified('riskScore')) {
    if (this.riskScore >= 75) {
      this.riskCategory = 'low';
    } else if (this.riskScore >= 50) {
      this.riskCategory = 'medium';
    } else if (this.riskScore >= 25) {
      this.riskCategory = 'high';
    } else {
      this.riskCategory = 'critical';
    }
  }

  next();
});

/**
 * Generate unique loan account number
 */
loanAccountSchema.statics.generateAccountNumber = async function () {
  const prefix = 'LS';
  const year = new Date().getFullYear().toString().slice(-2);
  const month = String(new Date().getMonth() + 1).padStart(2, '0');

  // Find the last account number for this month
  const lastLoan = await this.findOne({
    accountNumber: new RegExp(`^${prefix}${year}${month}`),
  }).sort({ accountNumber: -1 });

  let sequence = 1;
  if (lastLoan) {
    const lastSequence = parseInt(lastLoan.accountNumber.slice(-6), 10);
    sequence = lastSequence + 1;
  }

  return `${prefix}${year}${month}${String(sequence).padStart(6, '0')}`;
};

/**
 * Update payment statistics
 */
loanAccountSchema.methods.updatePaymentStats = async function () {
  const EMI = mongoose.model('EMI');

  const stats = await EMI.aggregate([
    { $match: { loanAccountId: this._id } },
    {
      $group: {
        _id: null,
        totalPaid: {
          $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$paidAmount', 0] },
        },
        totalPenalty: { $sum: '$penaltyAmount' },
        paidEMIs: {
          $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] },
        },
        overdueEMIs: {
          $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] },
        },
        outstandingPrincipal: {
          $sum: {
            $cond: [
              { $ne: ['$status', 'paid'] },
              '$principalComponent',
              0,
            ],
          },
        },
        outstandingInterest: {
          $sum: {
            $cond: [
              { $ne: ['$status', 'paid'] },
              '$interestComponent',
              0,
            ],
          },
        },
      },
    },
  ]);

  if (stats.length > 0) {
    const data = stats[0];
    this.totalPaid = data.totalPaid;
    this.totalPenalty = data.totalPenalty;
    this.paidEMIs = data.paidEMIs;
    this.overdueEMIs = data.overdueEMIs;
    this.unpaidEMIs = this.totalEMIs - data.paidEMIs;
    this.outstandingPrincipal = data.outstandingPrincipal;
    this.outstandingInterest = data.outstandingInterest;
    this.outstandingAmount = data.outstandingPrincipal + data.outstandingInterest;
  }

  // Get next due EMI
  const nextEmi = await EMI.findOne({
    loanAccountId: this._id,
    status: { $in: ['pending', 'overdue'] },
  }).sort({ sequence: 1 });

  if (nextEmi) {
    this.nextDueDate = nextEmi.dueDate;
    this.nextEmiAmount = nextEmi.amount;
    this.nextEmiSequence = nextEmi.sequence;
  } else {
    this.nextDueDate = null;
    this.nextEmiAmount = null;
  }

  // Update status based on overdue
  if (this.paidEMIs === this.totalEMIs) {
    this.status = 'closed';
    this.closureDate = new Date();
    this.closureType = 'regular';
  } else if (this.overdueEMIs > 0) {
    // Check for NPA (90+ days overdue)
    const oldestOverdue = await EMI.findOne({
      loanAccountId: this._id,
      status: 'overdue',
    }).sort({ dueDate: 1 });

    if (oldestOverdue) {
      const daysOverdue = Math.floor(
        (new Date() - oldestOverdue.dueDate) / (1000 * 60 * 60 * 24)
      );
      if (daysOverdue >= 90) {
        this.status = 'npa';
      } else {
        this.status = 'overdue';
      }
    }
  } else if (this.status !== 'pending' && this.status !== 'approved') {
    this.status = 'active';
  }

  await this.save();
};

/**
 * Check if loan can be prepaid/foreclosed
 */
loanAccountSchema.methods.canForeclose = function () {
  return ['active', 'overdue', 'disbursed'].includes(this.status);
};

const LoanAccount = mongoose.model('LoanAccount', loanAccountSchema);

module.exports = LoanAccount;
