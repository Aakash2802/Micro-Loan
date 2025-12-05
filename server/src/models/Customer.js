// server/src/models/Customer.js
const mongoose = require('mongoose');

/**
 * KYC Document Sub-Schema
 * Stores document type and URL reference
 */
const kycDocSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['aadhaar', 'pan', 'voter_id', 'passport', 'driving_license', 'bank_statement', 'salary_slip', 'other'],
      required: true,
    },
    documentNumber: {
      type: String,
      trim: true,
    },
    url: {
      type: String,
      required: [true, 'Document URL is required'],
      trim: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { _id: true }
);

/**
 * Customer Schema
 * Contains customer profile and KYC information
 * Linked to User model for authentication
 */
const customerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [150, 'Full name cannot exceed 150 characters'],
    },
    dob: {
      type: Date,
      required: [true, 'Date of birth is required'],
      validate: {
        validator: function (value) {
          // Must be at least 18 years old
          const today = new Date();
          const birthDate = new Date(value);
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          return age >= 18;
        },
        message: 'Customer must be at least 18 years old',
      },
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: [true, 'Gender is required'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Please provide a valid 10-digit Indian phone number'],
    },
    alternatePhone: {
      type: String,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Please provide a valid 10-digit phone number'],
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    address: {
      street: {
        type: String,
        required: [true, 'Street address is required'],
        trim: true,
      },
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true,
      },
      state: {
        type: String,
        required: [true, 'State is required'],
        trim: true,
      },
      pincode: {
        type: String,
        required: [true, 'Pincode is required'],
        match: [/^\d{6}$/, 'Please provide a valid 6-digit pincode'],
      },
      country: {
        type: String,
        default: 'India',
        trim: true,
      },
    },
    permanentAddress: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: {
        type: String,
        default: 'India',
      },
      sameAsCurrent: {
        type: Boolean,
        default: true,
      },
    },
    employmentType: {
      type: String,
      enum: ['salaried', 'self_employed', 'business', 'retired', 'student', 'unemployed'],
      required: [true, 'Employment type is required'],
    },
    employerName: {
      type: String,
      trim: true,
    },
    monthlyIncome: {
      type: Number,
      required: [true, 'Monthly income is required'],
      min: [0, 'Income cannot be negative'],
    },
    annualIncome: {
      type: Number,
      default: function () {
        return this.monthlyIncome * 12;
      },
    },
    bankDetails: {
      bankName: String,
      accountNumber: String,
      ifscCode: {
        type: String,
        match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Please provide a valid IFSC code'],
      },
      accountType: {
        type: String,
        enum: ['savings', 'current'],
      },
    },
    kycDocs: [kycDocSchema],
    kycStatus: {
      type: String,
      enum: ['pending', 'submitted', 'verified', 'rejected'],
      default: 'pending',
    },
    kycRemarks: {
      type: String,
      trim: true,
    },
    profilePhoto: {
      type: String,
      trim: true,
    },
    // Calculated fields
    creditScore: {
      type: Number,
      default: 50, // Initial score
      min: 0,
      max: 100,
    },
    totalLoans: {
      type: Number,
      default: 0,
    },
    activeLoans: {
      type: Number,
      default: 0,
    },
    totalBorrowed: {
      type: Number,
      default: 0,
    },
    totalRepaid: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
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

// Indexes for faster queries (userId index not needed - unique:true creates it)
customerSchema.index({ phone: 1 });
customerSchema.index({ 'address.city': 1 });
customerSchema.index({ kycStatus: 1 });
customerSchema.index({ createdAt: -1 });

// Virtual for age calculation
customerSchema.virtual('age').get(function () {
  if (!this.dob) return null;
  const today = new Date();
  const birthDate = new Date(this.dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Virtual for full address string
customerSchema.virtual('fullAddress').get(function () {
  if (!this.address) return '';
  const { street, city, state, pincode, country } = this.address;
  return `${street}, ${city}, ${state} - ${pincode}, ${country}`;
});

// Virtual to populate loans
customerSchema.virtual('loans', {
  ref: 'LoanAccount',
  localField: '_id',
  foreignField: 'customerId',
});

/**
 * Check if all required KYC documents are verified
 */
customerSchema.methods.isKycComplete = function () {
  const requiredDocs = ['aadhaar', 'pan'];
  const verifiedDocs = this.kycDocs.filter((doc) => doc.verified).map((doc) => doc.type);
  return requiredDocs.every((doc) => verifiedDocs.includes(doc));
};

/**
 * Update customer statistics
 */
customerSchema.methods.updateStats = async function () {
  const LoanAccount = mongoose.model('LoanAccount');

  const stats = await LoanAccount.aggregate([
    { $match: { customerId: this._id } },
    {
      $group: {
        _id: null,
        totalLoans: { $sum: 1 },
        activeLoans: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
        },
        totalBorrowed: { $sum: '$principal' },
        totalRepaid: {
          $sum: { $subtract: ['$principal', '$outstandingPrincipal'] },
        },
      },
    },
  ]);

  if (stats.length > 0) {
    this.totalLoans = stats[0].totalLoans;
    this.activeLoans = stats[0].activeLoans;
    this.totalBorrowed = stats[0].totalBorrowed;
    this.totalRepaid = stats[0].totalRepaid;
  }

  await this.save();
};

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;
