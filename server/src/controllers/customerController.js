// server/src/controllers/customerController.js
const { validationResult } = require('express-validator');
const Customer = require('../models/Customer');
const User = require('../models/User');
const LoanAccount = require('../models/LoanAccount');
const AuditLog = require('../models/AuditLog');
const { asyncHandler, APIError, createValidationError } = require('../middlewares/errorHandler');
const { calculateCustomerCreditScore } = require('../utils/creditScore');

/**
 * @desc    Get all customers (with pagination and filters)
 * @route   GET /api/customers
 * @access  Private/Staff
 */
const getCustomers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search,
    kycStatus,
    city,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  // Build query
  const query = { isActive: true };

  // Search by name, phone, or email
  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  if (kycStatus) query.kycStatus = kycStatus;
  if (city) query['address.city'] = { $regex: city, $options: 'i' };

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [customers, total] = await Promise.all([
    Customer.find(query)
      .populate('userId', 'name email')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit)),
    Customer.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      customers,
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
 * @desc    Get customer by ID
 * @route   GET /api/customers/:id
 * @access  Private
 */
const getCustomerById = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id)
    .populate('userId', 'name email role lastLogin')
    .populate('createdBy', 'name');

  if (!customer) {
    throw new APIError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  }

  // Get customer's loans
  const loans = await LoanAccount.find({ customerId: customer._id })
    .populate('productId', 'name code')
    .select('accountNumber principal status emiAmount outstandingAmount nextDueDate riskScore')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: {
      customer,
      loans,
      stats: {
        totalLoans: customer.totalLoans,
        activeLoans: customer.activeLoans,
        totalBorrowed: customer.totalBorrowed,
        totalRepaid: customer.totalRepaid,
        creditScore: customer.creditScore,
      },
    },
  });
});

/**
 * @desc    Create new customer
 * @route   POST /api/customers
 * @access  Private/Staff
 */
const createCustomer = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError(errors);
  }

  const {
    email,
    password,
    fullName,
    dob,
    gender,
    phone,
    alternatePhone,
    address,
    permanentAddress,
    employmentType,
    employerName,
    monthlyIncome,
    bankDetails,
    kycDocs,
    notes,
  } = req.body;

  // Check if phone already exists
  const existingCustomer = await Customer.findOne({ phone });
  if (existingCustomer) {
    throw new APIError('Phone number already registered', 409, 'PHONE_EXISTS');
  }

  // Check if email already exists (in User collection)
  if (email) {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new APIError('Email already registered', 409, 'EMAIL_EXISTS');
    }
  }

  // Create user account
  const user = new User({
    name: fullName,
    email: email?.toLowerCase() || `${phone}@loansphere.temp`,
    passwordHash: password || 'Temp@123',
    role: 'customer',
  });
  await user.save();

  // Create customer profile
  const customer = new Customer({
    userId: user._id,
    fullName,
    dob: new Date(dob),
    gender,
    phone,
    alternatePhone,
    email: email?.toLowerCase(),
    address,
    permanentAddress,
    employmentType,
    employerName,
    monthlyIncome,
    bankDetails,
    kycDocs: kycDocs || [],
    kycStatus: kycDocs && kycDocs.length > 0 ? 'submitted' : 'pending',
    notes,
    createdBy: req.user.userId,
  });
  await customer.save();

  // Audit log
  await AuditLog.log({
    type: 'customer_create',
    userId: req.user.userId,
    customerId: customer._id,
    message: `Customer created: ${fullName}`,
    details: { phone, email },
  });

  res.status(201).json({
    success: true,
    message: 'Customer created successfully',
    data: { customer },
  });
});

/**
 * @desc    Update customer
 * @route   PUT /api/customers/:id
 * @access  Private/Staff
 */
const updateCustomer = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError(errors);
  }

  const customer = await Customer.findById(req.params.id);
  if (!customer) {
    throw new APIError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  }

  const previousState = customer.toObject();

  // Fields that can be updated
  const updateableFields = [
    'fullName',
    'dob',
    'gender',
    'phone',
    'alternatePhone',
    'email',
    'address',
    'permanentAddress',
    'employmentType',
    'employerName',
    'monthlyIncome',
    'bankDetails',
    'notes',
    'profilePhoto',
  ];

  updateableFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      customer[field] = req.body[field];
    }
  });

  await customer.save();

  // Also update user name if fullName changed
  if (req.body.fullName) {
    await User.findByIdAndUpdate(customer.userId, { name: req.body.fullName });
  }

  // Audit log
  await AuditLog.log({
    type: 'customer_update',
    userId: req.user.userId,
    customerId: customer._id,
    message: `Customer updated: ${customer.fullName}`,
    previousState,
    newState: customer.toObject(),
  });

  res.json({
    success: true,
    message: 'Customer updated successfully',
    data: { customer },
  });
});

/**
 * @desc    Add KYC document
 * @route   POST /api/customers/:id/kyc
 * @access  Private/Staff
 */
const addKycDocument = asyncHandler(async (req, res) => {
  const { type, documentNumber, url } = req.body;

  if (!type || !url) {
    throw new APIError('Document type and URL are required', 400, 'MISSING_FIELDS');
  }

  const customer = await Customer.findById(req.params.id);
  if (!customer) {
    throw new APIError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  }

  // Check for duplicate document type
  const existingDoc = customer.kycDocs.find((doc) => doc.type === type);
  if (existingDoc) {
    // Update existing document
    existingDoc.documentNumber = documentNumber;
    existingDoc.url = url;
    existingDoc.verified = false;
    existingDoc.verifiedAt = null;
    existingDoc.verifiedBy = null;
  } else {
    // Add new document
    customer.kycDocs.push({
      type,
      documentNumber,
      url,
      verified: false,
    });
  }

  if (customer.kycStatus === 'pending') {
    customer.kycStatus = 'submitted';
  }

  await customer.save();

  await AuditLog.log({
    type: 'customer_kyc_submit',
    userId: req.user.userId,
    customerId: customer._id,
    message: `KYC document submitted: ${type}`,
  });

  res.json({
    success: true,
    message: 'KYC document added successfully',
    data: { kycDocs: customer.kycDocs },
  });
});

/**
 * @desc    Verify KYC document
 * @route   PATCH /api/customers/:id/kyc/:docId/verify
 * @access  Private/Staff
 */
const verifyKycDocument = asyncHandler(async (req, res) => {
  const { id, docId } = req.params;
  const { verified, remarks } = req.body;

  const customer = await Customer.findById(id);
  if (!customer) {
    throw new APIError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  }

  const doc = customer.kycDocs.id(docId);
  if (!doc) {
    throw new APIError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  doc.verified = verified;
  doc.verifiedAt = new Date();
  doc.verifiedBy = req.user.userId;

  // Update overall KYC status
  if (customer.isKycComplete()) {
    customer.kycStatus = 'verified';
  } else if (!verified) {
    customer.kycStatus = 'rejected';
    customer.kycRemarks = remarks;
  }

  await customer.save();

  await AuditLog.log({
    type: verified ? 'customer_kyc_verify' : 'customer_kyc_reject',
    userId: req.user.userId,
    customerId: customer._id,
    message: `KYC document ${verified ? 'verified' : 'rejected'}: ${doc.type}`,
    details: { remarks },
  });

  res.json({
    success: true,
    message: `KYC document ${verified ? 'verified' : 'rejected'} successfully`,
    data: { customer },
  });
});

/**
 * @desc    Get customer credit score
 * @route   GET /api/customers/:id/credit-score
 * @access  Private
 */
const getCustomerCreditScore = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) {
    throw new APIError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  }

  // Get all loans with EMIs
  const loans = await LoanAccount.find({ customerId: customer._id })
    .populate('emis')
    .lean();

  const creditScoreResult = calculateCustomerCreditScore(loans, customer);

  // Update customer's credit score
  customer.creditScore = creditScoreResult.score;
  await customer.save();

  res.json({
    success: true,
    data: {
      customerId: customer._id,
      customerName: customer.fullName,
      ...creditScoreResult,
    },
  });
});

/**
 * @desc    Get customer profile (for logged-in customer)
 * @route   GET /api/customers/my-profile
 * @access  Private/Customer
 */
const getMyProfile = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ userId: req.user.userId })
    .populate('userId', 'name email lastLogin');

  if (!customer) {
    throw new APIError('Customer profile not found', 404, 'PROFILE_NOT_FOUND');
  }

  // Get loans summary
  const loans = await LoanAccount.find({ customerId: customer._id })
    .populate('productId', 'name')
    .select('accountNumber principal status emiAmount outstandingAmount nextDueDate riskScore')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: {
      customer,
      loans,
    },
  });
});

/**
 * @desc    Update customer profile (for logged-in customer)
 * @route   PUT /api/customers/my-profile
 * @access  Private/Customer
 */
const updateMyProfile = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ userId: req.user.userId });

  if (!customer) {
    throw new APIError('Customer profile not found', 404, 'PROFILE_NOT_FOUND');
  }

  // Limited fields that customer can update themselves
  const allowedFields = ['alternatePhone', 'address', 'permanentAddress', 'profilePhoto'];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      customer[field] = req.body[field];
    }
  });

  await customer.save();

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { customer },
  });
});

/**
 * @desc    Soft delete customer
 * @route   DELETE /api/customers/:id
 * @access  Private/Admin
 */
const deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);

  if (!customer) {
    throw new APIError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  }

  // Check for active loans
  const activeLoans = await LoanAccount.countDocuments({
    customerId: customer._id,
    status: { $in: ['active', 'overdue', 'pending', 'approved'] },
  });

  if (activeLoans > 0) {
    throw new APIError(
      'Cannot delete customer with active loans',
      400,
      'HAS_ACTIVE_LOANS'
    );
  }

  // Soft delete
  customer.isActive = false;
  await customer.save();

  // Deactivate user account
  await User.findByIdAndUpdate(customer.userId, { isActive: false });

  await AuditLog.log({
    type: 'customer_delete',
    userId: req.user.userId,
    customerId: customer._id,
    message: `Customer deleted: ${customer.fullName}`,
  });

  res.json({
    success: true,
    message: 'Customer deleted successfully',
  });
});

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  addKycDocument,
  verifyKycDocument,
  getCustomerCreditScore,
  getMyProfile,
  updateMyProfile,
  deleteCustomer,
};
