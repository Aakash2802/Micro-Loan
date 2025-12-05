// server/src/controllers/mandateController.js
const Mandate = require('../models/Mandate');
const LoanAccount = require('../models/LoanAccount');
const Customer = require('../models/Customer');
const { asyncHandler, APIError } = require('../middlewares/errorHandler');

/**
 * @desc    Get customer's mandates
 * @route   GET /api/mandates/my-mandates
 * @access  Private/Customer
 */
const getMyMandates = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ userId: req.user.userId });
  if (!customer) {
    throw new APIError('Customer profile not found', 404, 'CUSTOMER_NOT_FOUND');
  }

  const mandates = await Mandate.getCustomerMandates(customer._id, true);

  res.json({
    success: true,
    data: { mandates },
  });
});

/**
 * @desc    Create mandate / Register auto-debit
 * @route   POST /api/mandates
 * @access  Private/Customer
 */
const createMandate = asyncHandler(async (req, res) => {
  const {
    loanAccountId,
    accountHolderName,
    bankName,
    accountNumber,
    ifscCode,
    accountType,
    mandateType,
    debitDay,
    consent,
  } = req.body;

  // Verify customer
  const customer = await Customer.findOne({ userId: req.user.userId });
  if (!customer) {
    throw new APIError('Customer profile not found', 404, 'CUSTOMER_NOT_FOUND');
  }

  // Verify loan belongs to customer
  const loan = await LoanAccount.findOne({
    _id: loanAccountId,
    customerId: customer._id,
    status: { $in: ['active', 'overdue', 'disbursed'] },
  });

  if (!loan) {
    throw new APIError('Loan not found or not eligible for auto-debit', 404, 'LOAN_NOT_FOUND');
  }

  // Check if active mandate already exists
  const existingMandate = await Mandate.getActiveMandateForLoan(loanAccountId);
  if (existingMandate) {
    throw new APIError(
      'Active mandate already exists for this loan',
      400,
      'MANDATE_EXISTS'
    );
  }

  // Require consent
  if (!consent) {
    throw new APIError('Consent is required for auto-debit registration', 400, 'CONSENT_REQUIRED');
  }

  // Calculate mandate period (until loan end date + buffer)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1); // Start from tomorrow

  const endDate = new Date(loan.endDate);
  endDate.setMonth(endDate.getMonth() + 3); // Add 3 months buffer

  // Create mandate
  const mandate = await Mandate.create({
    customerId: customer._id,
    loanAccountId,
    accountHolderName,
    bankName,
    accountNumber,
    ifscCode,
    accountType: accountType || 'savings',
    mandateType: mandateType || 'enach',
    maxAmount: Math.ceil(loan.emiAmount * 1.5), // 1.5x EMI for buffer (penalties etc)
    frequency: 'monthly',
    startDate,
    endDate,
    debitDay: debitDay || 5,
    consentGiven: true,
    consentTimestamp: new Date(),
    consentIP: req.ip,
    statusHistory: [{ status: 'pending', reason: 'Mandate created' }],
  });

  // In production, this would initiate the actual eNACH registration
  // For now, simulate by setting status to initiated
  await mandate.updateStatus('initiated', req.user.userId, 'Registration initiated');

  res.status(201).json({
    success: true,
    message: 'Auto-debit registration initiated. You will receive confirmation once bank approves.',
    data: { mandate },
  });
});

/**
 * @desc    Get mandate details
 * @route   GET /api/mandates/:id
 * @access  Private
 */
const getMandateById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const mandate = await Mandate.findById(id)
    .populate('customerId', 'fullName phone email')
    .populate('loanAccountId', 'accountNumber emiAmount principal status')
    .populate('statusHistory.changedBy', 'name');

  if (!mandate) {
    throw new APIError('Mandate not found', 404, 'MANDATE_NOT_FOUND');
  }

  // Verify access - customer can only see their own
  if (req.user.role === 'customer') {
    const customer = await Customer.findOne({ userId: req.user.userId });
    if (!customer || mandate.customerId._id.toString() !== customer._id.toString()) {
      throw new APIError('Access denied', 403, 'ACCESS_DENIED');
    }
  }

  res.json({
    success: true,
    data: { mandate },
  });
});

/**
 * @desc    Cancel mandate
 * @route   POST /api/mandates/:id/cancel
 * @access  Private
 */
const cancelMandate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const mandate = await Mandate.findById(id);
  if (!mandate) {
    throw new APIError('Mandate not found', 404, 'MANDATE_NOT_FOUND');
  }

  // Verify customer ownership
  if (req.user.role === 'customer') {
    const customer = await Customer.findOne({ userId: req.user.userId });
    if (!customer || mandate.customerId.toString() !== customer._id.toString()) {
      throw new APIError('Access denied', 403, 'ACCESS_DENIED');
    }
  }

  // Check if cancellable
  if (['cancelled', 'expired', 'rejected'].includes(mandate.status)) {
    throw new APIError('Mandate cannot be cancelled', 400, 'INVALID_STATUS');
  }

  await mandate.updateStatus('cancelled', req.user.userId, reason || 'Cancelled by user');

  res.json({
    success: true,
    message: 'Mandate cancelled successfully',
  });
});

/**
 * @desc    Get all mandates (Staff)
 * @route   GET /api/mandates
 * @access  Private/Staff
 */
const getAllMandates = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    customerId,
    loanAccountId,
  } = req.query;

  const query = {};
  if (status) query.status = status;
  if (customerId) query.customerId = customerId;
  if (loanAccountId) query.loanAccountId = loanAccountId;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [mandates, total] = await Promise.all([
    Mandate.find(query)
      .populate('customerId', 'fullName phone')
      .populate('loanAccountId', 'accountNumber emiAmount')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Mandate.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      mandates,
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
 * @desc    Update mandate status (Staff - simulate bank response)
 * @route   PATCH /api/mandates/:id/status
 * @access  Private/Staff
 */
const updateMandateStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, reason, bankReferenceNumber, umrn } = req.body;

  const mandate = await Mandate.findById(id);
  if (!mandate) {
    throw new APIError('Mandate not found', 404, 'MANDATE_NOT_FOUND');
  }

  // Validate status transition
  const validTransitions = {
    pending: ['initiated', 'rejected', 'cancelled'],
    initiated: ['approved', 'rejected', 'cancelled'],
    approved: ['active', 'rejected', 'cancelled'],
    active: ['suspended', 'cancelled', 'expired'],
    suspended: ['active', 'cancelled'],
  };

  if (!validTransitions[mandate.status]?.includes(status)) {
    throw new APIError(
      `Invalid status transition from ${mandate.status} to ${status}`,
      400,
      'INVALID_TRANSITION'
    );
  }

  // Update mandate
  if (status === 'approved' || status === 'active') {
    mandate.registrationDate = new Date();
    if (bankReferenceNumber) mandate.bankReferenceNumber = bankReferenceNumber;
    if (umrn) mandate.umrn = umrn;
  }

  if (status === 'rejected') {
    mandate.rejectionReason = reason;
  }

  await mandate.updateStatus(status, req.user.userId, reason);

  res.json({
    success: true,
    message: `Mandate status updated to ${status}`,
    data: { mandate },
  });
});

/**
 * @desc    Get supported banks list
 * @route   GET /api/mandates/banks
 * @access  Public
 */
const getSupportedBanks = asyncHandler(async (req, res) => {
  // Common Indian banks supporting eNACH
  const banks = [
    { code: 'HDFC', name: 'HDFC Bank', enachSupported: true },
    { code: 'ICIC', name: 'ICICI Bank', enachSupported: true },
    { code: 'SBIN', name: 'State Bank of India', enachSupported: true },
    { code: 'UTIB', name: 'Axis Bank', enachSupported: true },
    { code: 'KKBK', name: 'Kotak Mahindra Bank', enachSupported: true },
    { code: 'PUNB', name: 'Punjab National Bank', enachSupported: true },
    { code: 'BARB', name: 'Bank of Baroda', enachSupported: true },
    { code: 'CNRB', name: 'Canara Bank', enachSupported: true },
    { code: 'UBIN', name: 'Union Bank of India', enachSupported: true },
    { code: 'IOBA', name: 'Indian Overseas Bank', enachSupported: true },
    { code: 'BKID', name: 'Bank of India', enachSupported: true },
    { code: 'IDIB', name: 'IDBI Bank', enachSupported: true },
    { code: 'YESB', name: 'Yes Bank', enachSupported: true },
    { code: 'INDB', name: 'IndusInd Bank', enachSupported: true },
    { code: 'FDRL', name: 'Federal Bank', enachSupported: true },
  ];

  res.json({
    success: true,
    data: { banks },
  });
});

/**
 * @desc    Simulate mandate execution (for testing)
 * @route   POST /api/mandates/:id/execute
 * @access  Private/Staff
 */
const executeMandate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount, simulateFailure } = req.body;

  const mandate = await Mandate.findById(id).populate('loanAccountId');
  if (!mandate) {
    throw new APIError('Mandate not found', 404, 'MANDATE_NOT_FOUND');
  }

  if (mandate.status !== 'active') {
    throw new APIError('Mandate is not active', 400, 'MANDATE_NOT_ACTIVE');
  }

  const debitAmount = amount || mandate.loanAccountId.emiAmount;

  // Simulate execution
  const success = !simulateFailure;
  await mandate.recordDebitAttempt(debitAmount, success ? 'success' : 'failed');

  res.json({
    success: true,
    message: success
      ? `Successfully debited ${debitAmount}`
      : 'Debit failed - simulated failure',
    data: {
      mandate,
      execution: {
        amount: debitAmount,
        status: success ? 'success' : 'failed',
        timestamp: new Date(),
      },
    },
  });
});

module.exports = {
  getMyMandates,
  createMandate,
  getMandateById,
  cancelMandate,
  getAllMandates,
  updateMandateStatus,
  getSupportedBanks,
  executeMandate,
};
