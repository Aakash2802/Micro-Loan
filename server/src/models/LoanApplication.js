// server/src/models/LoanApplication.js
const mongoose = require('mongoose');

const loanApplicationSchema = new mongoose.Schema(
  {
    applicationNumber: {
      type: String,
      unique: true,
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LoanProduct',
      required: true,
    },
    requestedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    requestedTenure: {
      type: Number,
      required: true,
      min: 1,
    },
    purpose: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'under_review', 'recommended', 'approved', 'rejected', 'converted'],
      default: 'pending',
    },
    // Calculated fields (for display)
    estimatedEMI: {
      type: Number,
      default: 0,
    },
    estimatedInterestRate: {
      type: Number,
      default: 0,
    },
    // Review fields
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    reviewRemarks: {
      type: String,
    },
    // Officer recommendation (for high-value loans)
    recommendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    recommendedAt: {
      type: Date,
    },
    recommendRemarks: {
      type: String,
    },
    // Rejection reason
    rejectionReason: {
      type: String,
    },
    // Converted loan account reference
    loanAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LoanAccount',
    },
    // Additional info from customer
    employmentDetails: {
      type: {
        type: String,
        enum: ['salaried', 'self_employed', 'business', 'retired', 'student', 'other'],
      },
      employerName: String,
      monthlyIncome: Number,
      yearsEmployed: Number,
    },
    // Documents submitted with application
    documents: [
      {
        type: {
          type: String,
          enum: ['income_proof', 'address_proof', 'bank_statement', 'other'],
        },
        url: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Generate unique application number
loanApplicationSchema.statics.generateApplicationNumber = async function () {
  const prefix = 'APP';
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');

  // Find the last application of this month
  const lastApp = await this.findOne({
    applicationNumber: new RegExp(`^${prefix}${year}${month}`),
  }).sort({ applicationNumber: -1 });

  let sequence = 1;
  if (lastApp) {
    const lastSequence = parseInt(lastApp.applicationNumber.slice(-4));
    sequence = lastSequence + 1;
  }

  return `${prefix}${year}${month}${sequence.toString().padStart(4, '0')}`;
};

// Index for faster queries
loanApplicationSchema.index({ customerId: 1, status: 1 });
loanApplicationSchema.index({ status: 1, createdAt: -1 });
loanApplicationSchema.index({ applicationNumber: 1 });

const LoanApplication = mongoose.model('LoanApplication', loanApplicationSchema);

module.exports = LoanApplication;
