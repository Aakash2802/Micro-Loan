// server/src/controllers/loanApplicationController.js
const { validationResult } = require('express-validator');
const LoanApplication = require('../models/LoanApplication');
const LoanProduct = require('../models/LoanProduct');
const LoanAccount = require('../models/LoanAccount');
const Customer = require('../models/Customer');
const EMI = require('../models/EMI');
const AuditLog = require('../models/AuditLog');
const { asyncHandler, APIError, createValidationError } = require('../middlewares/errorHandler');
const { generateAmortizationSchedule } = require('../utils');
const { sendApplicationStatusEmail } = require('../utils/emailService');

// Amount threshold for officer direct approval
// Loans >= this amount require admin approval
// Configurable via OFFICER_APPROVAL_LIMIT env variable (default: ₹1 Lakh)
const OFFICER_APPROVAL_LIMIT = parseInt(process.env.OFFICER_APPROVAL_LIMIT) || 100000;

/**
 * @desc    Get available loan products for customers
 * @route   GET /api/loan-applications/products
 * @access  Private/Customer
 */
const getAvailableProducts = asyncHandler(async (req, res) => {
  const products = await LoanProduct.find({
    isActive: true,
    isPublished: true,
  }).select(
    'name code description category interestRate interestType minAmount maxAmount minTenureMonths maxTenureMonths processingFee features'
  );

  res.json({
    success: true,
    data: { products },
  });
});

/**
 * @desc    Check eligibility for a loan product
 * @route   POST /api/loan-applications/check-eligibility
 * @access  Private/Customer
 */
const checkEligibility = asyncHandler(async (req, res) => {
  const { productId, requestedAmount, requestedTenure } = req.body;

  // Get customer profile
  const customer = await Customer.findOne({ userId: req.user.userId });
  if (!customer) {
    throw new APIError('Customer profile not found', 404, 'PROFILE_NOT_FOUND');
  }

  // Get product
  const product = await LoanProduct.findById(productId);
  if (!product || !product.isActive || !product.isPublished) {
    throw new APIError('Loan product not found or not available', 404, 'PRODUCT_NOT_FOUND');
  }

  // Check eligibility
  const eligibilityResult = {
    eligible: true,
    reasons: [],
    suggestions: [],
  };

  // Check KYC status
  if (customer.kycStatus !== 'verified') {
    eligibilityResult.eligible = false;
    eligibilityResult.reasons.push('KYC verification is pending');
    eligibilityResult.suggestions.push('Complete your KYC verification to apply for loans');
  }

  // Check amount range
  if (requestedAmount < product.minAmount) {
    eligibilityResult.eligible = false;
    eligibilityResult.reasons.push(`Minimum loan amount is ₹${product.minAmount.toLocaleString()}`);
  }
  if (requestedAmount > product.maxAmount) {
    eligibilityResult.eligible = false;
    eligibilityResult.reasons.push(`Maximum loan amount is ₹${product.maxAmount.toLocaleString()}`);
  }

  // Check tenure range
  if (requestedTenure < product.minTenureMonths) {
    eligibilityResult.eligible = false;
    eligibilityResult.reasons.push(`Minimum tenure is ${product.minTenureMonths} months`);
  }
  if (requestedTenure > product.maxTenureMonths) {
    eligibilityResult.eligible = false;
    eligibilityResult.reasons.push(`Maximum tenure is ${product.maxTenureMonths} months`);
  }

  // Check product eligibility criteria
  const productEligibility = product.checkEligibility(customer);
  if (!productEligibility.eligible) {
    eligibilityResult.eligible = false;
    eligibilityResult.reasons.push(...productEligibility.reasons);
  }

  // Check existing active applications
  const existingApp = await LoanApplication.findOne({
    customerId: customer._id,
    productId: product._id,
    status: { $in: ['pending', 'under_review'] },
  });
  if (existingApp) {
    eligibilityResult.eligible = false;
    eligibilityResult.reasons.push('You already have a pending application for this product');
  }

  // Calculate EMI preview if eligible
  let emiPreview = null;
  if (eligibilityResult.eligible || eligibilityResult.reasons.length === 0) {
    const { summary } = generateAmortizationSchedule(
      requestedAmount,
      product.interestRate,
      requestedTenure,
      new Date(),
      product.interestType
    );
    const processingFee = product.calculateProcessingFee(requestedAmount);

    emiPreview = {
      emiAmount: summary.emiAmount,
      totalInterest: summary.totalInterest,
      totalPayable: summary.totalPayable,
      processingFee,
      disbursementAmount: requestedAmount - processingFee,
      interestRate: product.interestRate,
    };
  }

  res.json({
    success: true,
    data: {
      ...eligibilityResult,
      emiPreview,
      product: {
        name: product.name,
        interestRate: product.interestRate,
        interestType: product.interestType,
      },
    },
  });
});

/**
 * @desc    Submit loan application
 * @route   POST /api/loan-applications
 * @access  Private/Customer
 */
const submitApplication = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError(errors);
  }

  const { productId, requestedAmount, requestedTenure, purpose } = req.body;

  // Get customer profile
  const customer = await Customer.findOne({ userId: req.user.userId });
  if (!customer) {
    throw new APIError('Customer profile not found', 404, 'PROFILE_NOT_FOUND');
  }

  // Check KYC status
  if (customer.kycStatus !== 'verified') {
    throw new APIError(
      'Please complete KYC verification before applying for a loan',
      400,
      'KYC_NOT_VERIFIED'
    );
  }

  // Get product
  const product = await LoanProduct.findById(productId);
  if (!product || !product.isActive || !product.isPublished) {
    throw new APIError('Loan product not found or not available', 404, 'PRODUCT_NOT_FOUND');
  }

  // Validate amount range
  if (requestedAmount < product.minAmount || requestedAmount > product.maxAmount) {
    throw new APIError(
      `Loan amount must be between ₹${product.minAmount.toLocaleString()} and ₹${product.maxAmount.toLocaleString()}`,
      400,
      'INVALID_AMOUNT'
    );
  }

  // Validate tenure range
  if (requestedTenure < product.minTenureMonths || requestedTenure > product.maxTenureMonths) {
    throw new APIError(
      `Tenure must be between ${product.minTenureMonths} and ${product.maxTenureMonths} months`,
      400,
      'INVALID_TENURE'
    );
  }

  // Check for existing pending application
  const existingApp = await LoanApplication.findOne({
    customerId: customer._id,
    productId: product._id,
    status: { $in: ['pending', 'under_review'] },
  });
  if (existingApp) {
    throw new APIError(
      'You already have a pending application for this product',
      400,
      'DUPLICATE_APPLICATION'
    );
  }

  // Check product eligibility
  const eligibility = product.checkEligibility(customer);
  if (!eligibility.eligible) {
    throw new APIError(
      `Not eligible: ${eligibility.reasons.join(', ')}`,
      400,
      'NOT_ELIGIBLE'
    );
  }

  // Calculate EMI
  const { summary } = generateAmortizationSchedule(
    requestedAmount,
    product.interestRate,
    requestedTenure,
    new Date(),
    product.interestType
  );

  // Generate application number
  const applicationNumber = await LoanApplication.generateApplicationNumber();

  // Create application
  const application = new LoanApplication({
    applicationNumber,
    customerId: customer._id,
    productId: product._id,
    requestedAmount,
    requestedTenure,
    purpose,
    estimatedEMI: summary.emiAmount,
    estimatedInterestRate: product.interestRate,
    employmentDetails: {
      type: customer.employmentType,
      employerName: customer.employerName,
      monthlyIncome: customer.monthlyIncome,
    },
    status: 'pending',
  });

  await application.save();

  // Audit log
  await AuditLog.log({
    type: 'loan_application_submit',
    userId: req.user.userId,
    customerId: customer._id,
    message: `Loan application submitted: ${applicationNumber}`,
    amount: requestedAmount,
    details: { product: product.name, tenure: requestedTenure },
  });

  // Send email notification (async, don't wait)
  sendApplicationStatusEmail(
    { ...application.toObject(), productId: product },
    customer,
    'pending'
  ).catch((err) => console.error('[Email] Failed to send submission email:', err));

  res.status(201).json({
    success: true,
    message: 'Loan application submitted successfully',
    data: {
      application: {
        applicationNumber: application.applicationNumber,
        status: application.status,
        requestedAmount: application.requestedAmount,
        requestedTenure: application.requestedTenure,
        estimatedEMI: application.estimatedEMI,
        createdAt: application.createdAt,
      },
    },
  });
});

/**
 * @desc    Get customer's loan applications
 * @route   GET /api/loan-applications/my-applications
 * @access  Private/Customer
 */
const getMyApplications = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ userId: req.user.userId });
  if (!customer) {
    throw new APIError('Customer profile not found', 404, 'PROFILE_NOT_FOUND');
  }

  const applications = await LoanApplication.find({ customerId: customer._id })
    .populate('productId', 'name code interestRate')
    .sort({ createdAt: -1 });

  // Summary
  const summary = {
    total: applications.length,
    pending: applications.filter((a) => a.status === 'pending').length,
    underReview: applications.filter((a) => a.status === 'under_review').length,
    recommended: applications.filter((a) => a.status === 'recommended').length,
    approved: applications.filter((a) => a.status === 'approved').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
  };

  res.json({
    success: true,
    data: {
      applications,
      summary,
    },
  });
});

/**
 * @desc    Get application by ID (customer)
 * @route   GET /api/loan-applications/my-applications/:id
 * @access  Private/Customer
 */
const getMyApplicationById = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ userId: req.user.userId });
  if (!customer) {
    throw new APIError('Customer profile not found', 404, 'PROFILE_NOT_FOUND');
  }

  const application = await LoanApplication.findOne({
    _id: req.params.id,
    customerId: customer._id,
  }).populate('productId', 'name code interestRate interestType');

  if (!application) {
    throw new APIError('Application not found', 404, 'APPLICATION_NOT_FOUND');
  }

  res.json({
    success: true,
    data: { application },
  });
});

/**
 * @desc    Get all loan applications (staff)
 * @route   GET /api/loan-applications
 * @access  Private/Staff
 */
const getApplications = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const query = {};

  if (status) query.status = status;

  if (search) {
    query.$or = [
      { applicationNumber: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [applications, total] = await Promise.all([
    LoanApplication.find(query)
      .populate('customerId', 'fullName phone email kycStatus')
      .populate('productId', 'name code interestRate')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit)),
    LoanApplication.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      applications,
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
 * @desc    Get application by ID (staff)
 * @route   GET /api/loan-applications/:id
 * @access  Private/Staff
 */
const getApplicationById = asyncHandler(async (req, res) => {
  const application = await LoanApplication.findById(req.params.id)
    .populate('customerId')
    .populate('productId')
    .populate('reviewedBy', 'name');

  if (!application) {
    throw new APIError('Application not found', 404, 'APPLICATION_NOT_FOUND');
  }

  res.json({
    success: true,
    data: { application },
  });
});

/**
 * @desc    Review application (approve/reject/recommend)
 * @route   PATCH /api/loan-applications/:id/review
 * @access  Private/Staff
 *
 * Amount-based approval workflow:
 * - Loans < ₹1 Lakh: Officer can approve directly
 * - Loans >= ₹1 Lakh: Officer can only recommend, Admin must approve
 * - Admin can approve any loan amount directly
 */
const reviewApplication = asyncHandler(async (req, res) => {
  const { action, remarks, rejectionReason } = req.body;
  const userRole = req.user.role;

  if (!['approve', 'reject', 'under_review', 'recommend'].includes(action)) {
    throw new APIError('Invalid action', 400, 'INVALID_ACTION');
  }

  const application = await LoanApplication.findById(req.params.id)
    .populate('customerId')
    .populate('productId');

  if (!application) {
    throw new APIError('Application not found', 404, 'APPLICATION_NOT_FOUND');
  }

  // Determine valid statuses based on action
  const validStatuses = ['pending', 'under_review'];

  // Admin can approve recommended applications
  if (action === 'approve' && userRole === 'admin') {
    validStatuses.push('recommended');
  }

  // Both admin and officer can reject recommended applications
  if (action === 'reject') {
    validStatuses.push('recommended');
  }

  if (!validStatuses.includes(application.status)) {
    throw new APIError(
      `Cannot ${action} application with status: ${application.status}`,
      400,
      'INVALID_STATUS'
    );
  }

  // Check amount-based approval rules
  const isHighValueLoan = application.requestedAmount >= OFFICER_APPROVAL_LIMIT;

  // Officer trying to approve high-value loan - must recommend instead
  if (action === 'approve' && userRole === 'officer' && isHighValueLoan) {
    throw new APIError(
      `Loans of ₹${OFFICER_APPROVAL_LIMIT.toLocaleString()} or above require admin approval. Please use "Recommend" instead.`,
      403,
      'APPROVAL_LIMIT_EXCEEDED'
    );
  }

  // Only officers can recommend
  if (action === 'recommend' && userRole === 'admin') {
    throw new APIError(
      'Admin can directly approve. Use "Approve" instead of "Recommend".',
      400,
      'INVALID_ACTION_FOR_ROLE'
    );
  }

  // Handle under_review action
  if (action === 'under_review') {
    application.status = 'under_review';
    application.reviewedBy = req.user.userId;
    application.reviewedAt = new Date();
    application.reviewRemarks = remarks;
    await application.save();

    res.json({
      success: true,
      message: 'Application marked as under review',
      data: { application },
    });
    return;
  }

  // Handle recommend action (officer only, high-value loans)
  if (action === 'recommend') {
    application.status = 'recommended';
    application.recommendedBy = req.user.userId;
    application.recommendedAt = new Date();
    application.recommendRemarks = remarks;
    await application.save();

    await AuditLog.log({
      type: 'loan_application_recommend',
      userId: req.user.userId,
      customerId: application.customerId._id,
      message: `Loan application recommended for admin approval: ${application.applicationNumber}`,
      amount: application.requestedAmount,
    });

    // Send email notification
    sendApplicationStatusEmail(application, application.customerId, 'recommended', remarks)
      .catch((err) => console.error('[Email] Failed to send recommend email:', err));

    res.json({
      success: true,
      message: 'Application recommended for admin approval',
      data: { application },
    });
    return;
  }

  // Handle reject action
  if (action === 'reject') {
    if (!rejectionReason) {
      throw new APIError('Rejection reason is required', 400, 'REASON_REQUIRED');
    }
    application.status = 'rejected';
    application.rejectionReason = rejectionReason;
    application.reviewedBy = req.user.userId;
    application.reviewedAt = new Date();
    application.reviewRemarks = remarks;
    await application.save();

    await AuditLog.log({
      type: 'loan_application_reject',
      userId: req.user.userId,
      customerId: application.customerId._id,
      message: `Loan application rejected: ${application.applicationNumber}`,
      details: { reason: rejectionReason },
    });

    // Send email notification
    sendApplicationStatusEmail(application, application.customerId, 'rejected', rejectionReason)
      .catch((err) => console.error('[Email] Failed to send rejection email:', err));

    res.json({
      success: true,
      message: 'Application rejected',
      data: { application },
    });
    return;
  }

  // Approve and convert to loan account
  const customer = application.customerId;
  const product = application.productId;

  // Generate amortization schedule
  const loanStartDate = new Date();
  const { summary, schedule } = generateAmortizationSchedule(
    application.requestedAmount,
    product.interestRate,
    application.requestedTenure,
    loanStartDate,
    product.interestType
  );

  // Calculate processing fee
  const processingFee = product.calculateProcessingFee(application.requestedAmount);

  // Generate account number
  const accountNumber = await LoanAccount.generateAccountNumber();

  // Create loan account
  const loan = new LoanAccount({
    accountNumber,
    customerId: customer._id,
    productId: product._id,
    principal: application.requestedAmount,
    interestRate: product.interestRate,
    interestType: product.interestType,
    tenureMonths: application.requestedTenure,
    emiAmount: summary.emiAmount,
    totalEMIs: application.requestedTenure,
    startDate: loanStartDate,
    firstEmiDate: schedule[0].dueDate,
    totalInterest: summary.totalInterest,
    totalPayable: summary.totalPayable,
    processingFee,
    disbursedAmount: application.requestedAmount - processingFee,
    outstandingPrincipal: application.requestedAmount,
    outstandingAmount: summary.totalPayable,
    status: 'approved',
    purpose: application.purpose,
    approvedBy: req.user.userId,
    approvalDate: new Date(),
    createdBy: req.user.userId,
  });

  await loan.save();

  // Create EMIs
  const emis = schedule.map((emiData) => ({
    loanAccountId: loan._id,
    sequence: emiData.sequence,
    dueDate: emiData.dueDate,
    amount: emiData.amount,
    principalComponent: emiData.principalComponent,
    interestComponent: emiData.interestComponent,
    openingBalance: emiData.openingBalance,
    closingBalance: emiData.closingBalance,
    status: 'pending',
  }));

  await EMI.insertMany(emis);

  // Update loan with next due date
  loan.nextDueDate = schedule[0].dueDate;
  loan.nextEmiAmount = schedule[0].amount;
  loan.nextEmiSequence = 1;
  await loan.save();

  // Update application status
  application.status = 'approved';
  application.loanAccountId = loan._id;
  await application.save();

  // Update customer stats
  await customer.updateStats();

  // Audit log
  await AuditLog.log({
    type: 'loan_application_approve',
    userId: req.user.userId,
    customerId: customer._id,
    loanAccountId: loan._id,
    message: `Loan application approved: ${application.applicationNumber} → ${accountNumber}`,
    amount: application.requestedAmount,
  });

  // Send email notification
  sendApplicationStatusEmail(application, customer, 'approved', remarks)
    .catch((err) => console.error('[Email] Failed to send approval email:', err));

  res.json({
    success: true,
    message: 'Application approved and loan account created',
    data: {
      application,
      loan: {
        accountNumber: loan.accountNumber,
        principal: loan.principal,
        emiAmount: loan.emiAmount,
        status: loan.status,
      },
    },
  });
});

/**
 * @desc    Get approval workflow configuration
 * @route   GET /api/loan-applications/config
 * @access  Private/Staff
 */
const getApprovalConfig = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      officerApprovalLimit: OFFICER_APPROVAL_LIMIT,
    },
  });
});

module.exports = {
  getAvailableProducts,
  checkEligibility,
  submitApplication,
  getMyApplications,
  getMyApplicationById,
  getApplications,
  getApplicationById,
  reviewApplication,
  getApprovalConfig,
};
