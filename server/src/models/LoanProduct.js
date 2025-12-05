// server/src/models/LoanProduct.js
const mongoose = require('mongoose');

/**
 * Loan Product Schema
 * Defines different loan products offered by the system
 * e.g., Personal Loan, Business Loan, Education Loan
 */
const loanProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      unique: true,
      minlength: [3, 'Product name must be at least 3 characters'],
      maxlength: [100, 'Product name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    code: {
      type: String,
      required: [true, 'Product code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z]{2,10}$/, 'Product code must be 2-10 uppercase letters'],
    },
    category: {
      type: String,
      enum: ['personal', 'business', 'education', 'vehicle', 'home', 'gold', 'agriculture', 'other'],
      default: 'personal',
    },
    interestRate: {
      type: Number,
      required: [true, 'Interest rate is required'],
      min: [0, 'Interest rate cannot be negative'],
      max: [50, 'Interest rate cannot exceed 50%'],
    },
    interestType: {
      type: String,
      enum: ['reducing', 'flat'],
      default: 'reducing',
      // 'reducing' = interest calculated on outstanding principal (standard EMI)
      // 'flat' = interest calculated on initial principal throughout tenure
    },
    minTenureMonths: {
      type: Number,
      required: [true, 'Minimum tenure is required'],
      min: [1, 'Minimum tenure must be at least 1 month'],
    },
    maxTenureMonths: {
      type: Number,
      required: [true, 'Maximum tenure is required'],
      validate: {
        validator: function (value) {
          return value >= this.minTenureMonths;
        },
        message: 'Maximum tenure must be greater than or equal to minimum tenure',
      },
    },
    tenureMonths: {
      type: Number,
      default: function () {
        return this.minTenureMonths;
      },
    },
    minAmount: {
      type: Number,
      required: [true, 'Minimum loan amount is required'],
      min: [1000, 'Minimum amount must be at least ₹1,000'],
    },
    maxAmount: {
      type: Number,
      required: [true, 'Maximum loan amount is required'],
      validate: {
        validator: function (value) {
          return value >= this.minAmount;
        },
        message: 'Maximum amount must be greater than or equal to minimum amount',
      },
    },
    processingFee: {
      type: Number,
      default: 0,
      min: [0, 'Processing fee cannot be negative'],
    },
    processingFeeType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage',
    },
    latePenaltyRate: {
      type: Number,
      default: 2, // 2% per day or flat rate depending on latePenaltyType
      min: [0, 'Late penalty rate cannot be negative'],
    },
    latePenaltyType: {
      type: String,
      enum: ['percentage', 'fixed_per_day', 'percentage_per_day'],
      default: 'percentage',
    },
    gracePeriodDays: {
      type: Number,
      default: 0,
      min: [0, 'Grace period cannot be negative'],
      max: [30, 'Grace period cannot exceed 30 days'],
    },
    prepaymentAllowed: {
      type: Boolean,
      default: true,
    },
    prepaymentPenaltyRate: {
      type: Number,
      default: 0,
      min: [0, 'Prepayment penalty cannot be negative'],
    },
    eligibilityCriteria: {
      minAge: {
        type: Number,
        default: 21,
      },
      maxAge: {
        type: Number,
        default: 60,
      },
      minIncome: {
        type: Number,
        default: 10000,
      },
      employmentTypes: {
        type: [String],
        default: ['salaried', 'self_employed', 'business'],
      },
      minCreditScore: {
        type: Number,
        default: 30,
      },
    },
    requiredDocuments: {
      type: [String],
      default: ['aadhaar', 'pan'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    effectiveFrom: {
      type: Date,
      default: Date.now,
    },
    effectiveTo: {
      type: Date,
      default: null,
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

// Indexes (code index not needed - unique:true creates it)
loanProductSchema.index({ isActive: 1, isPublished: 1 });
loanProductSchema.index({ category: 1 });

// Virtual for processing fee calculation display
loanProductSchema.virtual('processingFeeDisplay').get(function () {
  if (this.processingFeeType === 'percentage') {
    return `${this.processingFee}%`;
  }
  return `₹${this.processingFee}`;
});

// Virtual for interest rate display
loanProductSchema.virtual('interestRateDisplay').get(function () {
  return `${this.interestRate}% p.a. (${this.interestType})`;
});

/**
 * Calculate processing fee for a given principal
 * @param {number} principal - Loan principal amount
 * @returns {number} - Processing fee amount
 */
loanProductSchema.methods.calculateProcessingFee = function (principal) {
  if (this.processingFeeType === 'percentage') {
    return (principal * this.processingFee) / 100;
  }
  return this.processingFee;
};

/**
 * Calculate late penalty for overdue EMI
 * @param {number} emiAmount - EMI amount
 * @param {number} daysLate - Number of days overdue
 * @returns {number} - Penalty amount
 */
loanProductSchema.methods.calculateLatePenalty = function (emiAmount, daysLate) {
  if (daysLate <= this.gracePeriodDays) return 0;

  const effectiveDaysLate = daysLate - this.gracePeriodDays;

  switch (this.latePenaltyType) {
    case 'percentage':
      return (emiAmount * this.latePenaltyRate) / 100;
    case 'fixed_per_day':
      return this.latePenaltyRate * effectiveDaysLate;
    case 'percentage_per_day':
      return (emiAmount * this.latePenaltyRate * effectiveDaysLate) / 100;
    default:
      return 0;
  }
};

/**
 * Check if a customer is eligible for this product
 * @param {Object} customer - Customer document
 * @returns {Object} - { eligible: boolean, reasons: string[] }
 */
loanProductSchema.methods.checkEligibility = function (customer) {
  const reasons = [];
  const criteria = this.eligibilityCriteria;

  // Age check
  if (customer.age < criteria.minAge) {
    reasons.push(`Minimum age requirement is ${criteria.minAge} years`);
  }
  if (customer.age > criteria.maxAge) {
    reasons.push(`Maximum age limit is ${criteria.maxAge} years`);
  }

  // Income check
  if (customer.monthlyIncome < criteria.minIncome) {
    reasons.push(`Minimum monthly income requirement is ₹${criteria.minIncome}`);
  }

  // Employment type check
  if (!criteria.employmentTypes.includes(customer.employmentType)) {
    reasons.push(`Employment type must be one of: ${criteria.employmentTypes.join(', ')}`);
  }

  // Credit score check
  if (customer.creditScore < criteria.minCreditScore) {
    reasons.push(`Minimum credit score requirement is ${criteria.minCreditScore}`);
  }

  return {
    eligible: reasons.length === 0,
    reasons,
  };
};

/**
 * Static method to get active published products
 */
loanProductSchema.statics.getActiveProducts = function () {
  const now = new Date();
  return this.find({
    isActive: true,
    isPublished: true,
    effectiveFrom: { $lte: now },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: now } }],
  }).sort({ category: 1, name: 1 });
};

const LoanProduct = mongoose.model('LoanProduct', loanProductSchema);

module.exports = LoanProduct;
