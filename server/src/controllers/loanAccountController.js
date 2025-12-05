// server/src/controllers/loanAccountController.js
const { validationResult } = require('express-validator');
const LoanAccount = require('../models/LoanAccount');
const LoanProduct = require('../models/LoanProduct');
const Customer = require('../models/Customer');
const EMI = require('../models/EMI');
const AuditLog = require('../models/AuditLog');
const { asyncHandler, APIError, createValidationError } = require('../middlewares/errorHandler');
const { generateAmortizationSchedule, calculateLoanRiskScore } = require('../utils');

/**
 * @desc    Get all loan accounts (with pagination and filters)
 * @route   GET /api/loan-accounts
 * @access  Private/Staff
 */
const getLoanAccounts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    customerId,
    productId,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const query = { isDeleted: false };

  if (status) query.status = status;
  if (customerId) query.customerId = customerId;
  if (productId) query.productId = productId;

  // Search by account number
  if (search) {
    query.accountNumber = { $regex: search, $options: 'i' };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [loans, total] = await Promise.all([
    LoanAccount.find(query)
      .populate('customerId', 'fullName phone')
      .populate('productId', 'name code')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit)),
    LoanAccount.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      loans,
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
 * @desc    Get loan account by ID
 * @route   GET /api/loan-accounts/:id
 * @access  Private
 */
const getLoanAccountById = asyncHandler(async (req, res) => {
  const loan = await LoanAccount.findById(req.params.id)
    .populate('customerId')
    .populate('productId')
    .populate('approvedBy', 'name')
    .populate('createdBy', 'name');

  if (!loan || loan.isDeleted) {
    throw new APIError('Loan account not found', 404, 'LOAN_NOT_FOUND');
  }

  // For customers, verify ownership
  if (req.user.role === 'customer') {
    const customer = await Customer.findOne({ userId: req.user.userId });
    if (!customer || loan.customerId._id.toString() !== customer._id.toString()) {
      throw new APIError('Access denied', 403, 'NOT_OWNER');
    }
  }

  // Get EMIs
  const emis = await EMI.find({ loanAccountId: loan._id })
    .sort({ sequence: 1 });

  // Get audit trail (for staff only)
  let auditTrail = [];
  if (['admin', 'officer'].includes(req.user.role)) {
    const auditResult = await AuditLog.getLoanAuditTrail(loan._id, { limit: 20 });
    auditTrail = auditResult.logs;
  }

  res.json({
    success: true,
    data: {
      loan,
      emis,
      auditTrail,
    },
  });
});

/**
 * @desc    Create loan account for customer
 * @route   POST /api/loan-accounts
 * @access  Private/Staff
 */
const createLoanAccount = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError(errors);
  }

  const {
    customerId,
    productId,
    principal,
    tenureMonths,
    startDate,
    purpose,
    collateral,
    guarantorName,
    guarantorPhone,
    notes,
    autoApprove = false,
  } = req.body;

  // Verify customer exists and is active
  const customer = await Customer.findById(customerId);
  if (!customer || !customer.isActive) {
    throw new APIError('Customer not found or inactive', 404, 'CUSTOMER_NOT_FOUND');
  }

  // Verify KYC status
  if (customer.kycStatus !== 'verified') {
    throw new APIError('Customer KYC is not verified', 400, 'KYC_NOT_VERIFIED');
  }

  // Verify product exists and is active
  const product = await LoanProduct.findById(productId);
  if (!product || !product.isActive || !product.isPublished) {
    throw new APIError('Loan product not found or inactive', 404, 'PRODUCT_NOT_FOUND');
  }

  // Validate principal amount
  if (principal < product.minAmount || principal > product.maxAmount) {
    throw new APIError(
      `Principal must be between ₹${product.minAmount} and ₹${product.maxAmount}`,
      400,
      'INVALID_PRINCIPAL'
    );
  }

  // Validate tenure
  if (tenureMonths < product.minTenureMonths || tenureMonths > product.maxTenureMonths) {
    throw new APIError(
      `Tenure must be between ${product.minTenureMonths} and ${product.maxTenureMonths} months`,
      400,
      'INVALID_TENURE'
    );
  }

  // Check eligibility
  const eligibility = product.checkEligibility(customer);
  if (!eligibility.eligible) {
    throw new APIError(
      `Customer not eligible: ${eligibility.reasons.join(', ')}`,
      400,
      'NOT_ELIGIBLE'
    );
  }

  // Generate amortization schedule
  const loanStartDate = new Date(startDate || Date.now());
  const { summary, schedule } = generateAmortizationSchedule(
    principal,
    product.interestRate,
    tenureMonths,
    loanStartDate,
    product.interestType
  );

  // Calculate processing fee
  const processingFee = product.calculateProcessingFee(principal);

  // Generate account number
  const accountNumber = await LoanAccount.generateAccountNumber();

  // Create loan account
  const loan = new LoanAccount({
    accountNumber,
    customerId,
    productId,
    principal,
    interestRate: product.interestRate,
    interestType: product.interestType,
    tenureMonths,
    emiAmount: summary.emiAmount,
    totalEMIs: tenureMonths,
    startDate: loanStartDate,
    firstEmiDate: schedule[0].dueDate,
    totalInterest: summary.totalInterest,
    totalPayable: summary.totalPayable,
    processingFee,
    disbursedAmount: principal - processingFee,
    outstandingPrincipal: principal,
    outstandingAmount: summary.totalPayable,
    status: autoApprove ? 'approved' : 'pending',
    purpose,
    collateral,
    guarantorName,
    guarantorPhone,
    notes,
    createdBy: req.user.userId,
  });

  if (autoApprove) {
    loan.approvedBy = req.user.userId;
    loan.approvalDate = new Date();
  }

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

  // Update customer stats
  await customer.updateStats();

  // Audit log
  await AuditLog.log({
    type: 'loan_apply',
    userId: req.user.userId,
    customerId,
    loanAccountId: loan._id,
    message: `Loan application created: ${accountNumber}`,
    amount: principal,
    details: { product: product.name, tenureMonths },
  });

  res.status(201).json({
    success: true,
    message: 'Loan account created successfully',
    data: {
      loan,
      emiSchedule: schedule,
    },
  });
});

/**
 * @desc    Approve loan application
 * @route   PATCH /api/loan-accounts/:id/approve
 * @access  Private/Staff
 */
const approveLoan = asyncHandler(async (req, res) => {
  const { remarks } = req.body;

  const loan = await LoanAccount.findById(req.params.id);
  if (!loan || loan.isDeleted) {
    throw new APIError('Loan account not found', 404, 'LOAN_NOT_FOUND');
  }

  if (loan.status !== 'pending') {
    throw new APIError(`Cannot approve loan with status: ${loan.status}`, 400, 'INVALID_STATUS');
  }

  loan.status = 'approved';
  loan.approvedBy = req.user.userId;
  loan.approvalDate = new Date();
  loan.approvalRemarks = remarks;
  await loan.save();

  await AuditLog.logLoan(
    'loan_approve',
    req.user.userId,
    loan._id,
    `Loan approved: ${loan.accountNumber}`,
    { remarks },
    loan.principal
  );

  res.json({
    success: true,
    message: 'Loan approved successfully',
    data: { loan },
  });
});

/**
 * @desc    Reject loan application
 * @route   PATCH /api/loan-accounts/:id/reject
 * @access  Private/Staff
 */
const rejectLoan = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  if (!reason) {
    throw new APIError('Rejection reason is required', 400, 'REASON_REQUIRED');
  }

  const loan = await LoanAccount.findById(req.params.id);
  if (!loan || loan.isDeleted) {
    throw new APIError('Loan account not found', 404, 'LOAN_NOT_FOUND');
  }

  if (loan.status !== 'pending') {
    throw new APIError(`Cannot reject loan with status: ${loan.status}`, 400, 'INVALID_STATUS');
  }

  loan.status = 'rejected';
  loan.rejectionReason = reason;
  await loan.save();

  await AuditLog.logLoan(
    'loan_reject',
    req.user.userId,
    loan._id,
    `Loan rejected: ${loan.accountNumber}`,
    { reason }
  );

  res.json({
    success: true,
    message: 'Loan rejected',
    data: { loan },
  });
});

/**
 * @desc    Disburse loan
 * @route   POST /api/loan-accounts/:id/disburse
 * @access  Private/Staff
 */
const disburseLoan = asyncHandler(async (req, res) => {
  const {
    amount,
    mode,
    referenceNumber,
    bankName,
    accountNumber,
    remarks,
  } = req.body;

  const loan = await LoanAccount.findById(req.params.id).populate('customerId');
  if (!loan || loan.isDeleted) {
    throw new APIError('Loan account not found', 404, 'LOAN_NOT_FOUND');
  }

  if (loan.status !== 'approved') {
    throw new APIError(
      `Cannot disburse loan with status: ${loan.status}. Loan must be approved first.`,
      400,
      'INVALID_STATUS'
    );
  }

  // Validate disbursement amount
  const expectedAmount = loan.disbursedAmount;
  if (Math.abs(amount - expectedAmount) > 0.01) {
    throw new APIError(
      `Disbursement amount mismatch. Expected: ₹${expectedAmount}`,
      400,
      'AMOUNT_MISMATCH'
    );
  }

  loan.disbursement = {
    amount,
    date: new Date(),
    mode,
    referenceNumber,
    bankName,
    accountNumber,
    remarks,
    disbursedBy: req.user.userId,
  };
  loan.status = 'active';
  await loan.save();

  // Update customer stats
  await loan.customerId.updateStats();

  await AuditLog.logLoan(
    'loan_disburse',
    req.user.userId,
    loan._id,
    `Loan disbursed: ${loan.accountNumber}`,
    { mode, referenceNumber },
    amount
  );

  res.json({
    success: true,
    message: 'Loan disbursed successfully',
    data: { loan },
  });
});

/**
 * @desc    Get customer's loans
 * @route   GET /api/loan-accounts/my-loans
 * @access  Private/Customer
 */
const getMyLoans = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ userId: req.user.userId });
  if (!customer) {
    throw new APIError('Customer profile not found', 404, 'PROFILE_NOT_FOUND');
  }

  const loans = await LoanAccount.find({
    customerId: customer._id,
    isDeleted: false,
  })
    .populate('productId', 'name code')
    .sort({ createdAt: -1 });

  // Get summary stats
  const summary = {
    totalLoans: loans.length,
    activeLoans: loans.filter((l) => ['active', 'overdue'].includes(l.status)).length,
    totalBorrowed: loans.reduce((sum, l) => sum + l.principal, 0),
    totalOutstanding: loans.reduce((sum, l) => sum + l.outstandingAmount, 0),
    nextEmiDate: null,
    nextEmiAmount: 0,
  };

  // Find next EMI due
  const activeLoans = loans.filter((l) => l.nextDueDate);
  if (activeLoans.length > 0) {
    const sortedByDueDate = activeLoans.sort((a, b) => a.nextDueDate - b.nextDueDate);
    summary.nextEmiDate = sortedByDueDate[0].nextDueDate;
    summary.nextEmiAmount = sortedByDueDate[0].nextEmiAmount;
  }

  res.json({
    success: true,
    data: {
      loans,
      summary,
    },
  });
});

/**
 * @desc    Get loan EMI schedule
 * @route   GET /api/loan-accounts/:id/emis
 * @access  Private
 */
const getLoanEMIs = asyncHandler(async (req, res) => {
  const { status } = req.query;

  const loan = await LoanAccount.findById(req.params.id);
  if (!loan || loan.isDeleted) {
    throw new APIError('Loan account not found', 404, 'LOAN_NOT_FOUND');
  }

  // For customers, verify ownership
  if (req.user.role === 'customer') {
    const customer = await Customer.findOne({ userId: req.user.userId });
    if (!customer || loan.customerId.toString() !== customer._id.toString()) {
      throw new APIError('Access denied', 403, 'NOT_OWNER');
    }
  }

  const query = { loanAccountId: loan._id };
  if (status) query.status = status;

  const emis = await EMI.find(query).sort({ sequence: 1 });

  // Calculate summary
  const summary = {
    total: emis.length,
    paid: emis.filter((e) => e.status === 'paid').length,
    pending: emis.filter((e) => e.status === 'pending').length,
    overdue: emis.filter((e) => e.status === 'overdue').length,
    totalPaid: emis.reduce((sum, e) => sum + e.paidAmount, 0),
    totalPenalty: emis.reduce((sum, e) => sum + e.penaltyAmount, 0),
  };

  res.json({
    success: true,
    data: {
      loan: {
        accountNumber: loan.accountNumber,
        status: loan.status,
        emiAmount: loan.emiAmount,
        outstandingAmount: loan.outstandingAmount,
      },
      emis,
      summary,
    },
  });
});

/**
 * @desc    Get loan risk score
 * @route   GET /api/loan-accounts/:id/risk-score
 * @access  Private/Staff
 */
const getLoanRiskScore = asyncHandler(async (req, res) => {
  const loan = await LoanAccount.findById(req.params.id).populate('customerId');
  if (!loan || loan.isDeleted) {
    throw new APIError('Loan account not found', 404, 'LOAN_NOT_FOUND');
  }

  const emis = await EMI.find({ loanAccountId: loan._id });

  const { calculateLoanRiskScore } = require('../utils/creditScore');
  const riskScore = calculateLoanRiskScore(loan, emis, loan.customerId);

  // Update loan's risk score
  loan.riskScore = riskScore.score;
  loan.riskCategory = riskScore.category.risk.toLowerCase();
  await loan.save();

  res.json({
    success: true,
    data: {
      accountNumber: loan.accountNumber,
      ...riskScore,
    },
  });
});

/**
 * @desc    Close/Foreclose loan
 * @route   POST /api/loan-accounts/:id/close
 * @access  Private/Staff
 */
const closeLoan = asyncHandler(async (req, res) => {
  const { closureType, remarks } = req.body;

  const loan = await LoanAccount.findById(req.params.id);
  if (!loan || loan.isDeleted) {
    throw new APIError('Loan account not found', 404, 'LOAN_NOT_FOUND');
  }

  if (!loan.canForeclose() && closureType !== 'write_off') {
    throw new APIError(
      `Cannot close loan with status: ${loan.status}`,
      400,
      'INVALID_STATUS'
    );
  }

  loan.status = closureType === 'write_off' ? 'defaulted' : 'closed';
  loan.closureDate = new Date();
  loan.closureType = closureType;
  loan.closureRemarks = remarks;
  loan.closedBy = req.user.userId;
  await loan.save();

  // Update customer stats
  const customer = await Customer.findById(loan.customerId);
  if (customer) {
    await customer.updateStats();
  }

  await AuditLog.logLoan(
    'loan_close',
    req.user.userId,
    loan._id,
    `Loan closed: ${loan.accountNumber} (${closureType})`,
    { remarks }
  );

  res.json({
    success: true,
    message: 'Loan closed successfully',
    data: { loan },
  });
});

/**
 * @desc    Restructure loan (modify tenure/EMI)
 * @route   POST /api/loan-accounts/:id/restructure
 * @access  Private/Admin
 */
const restructureLoan = asyncHandler(async (req, res) => {
  const { newTenure, newInterestRate, reason, startFromNext = true } = req.body;

  if (!newTenure && !newInterestRate) {
    throw new APIError('Either new tenure or new interest rate is required', 400, 'MISSING_PARAMS');
  }

  if (!reason) {
    throw new APIError('Restructuring reason is required', 400, 'REASON_REQUIRED');
  }

  const loan = await LoanAccount.findById(req.params.id).populate('productId');
  if (!loan || loan.isDeleted) {
    throw new APIError('Loan account not found', 404, 'LOAN_NOT_FOUND');
  }

  if (!['active', 'overdue'].includes(loan.status)) {
    throw new APIError('Can only restructure active or overdue loans', 400, 'INVALID_STATUS');
  }

  // Get current outstanding principal
  const pendingEmis = await EMI.find({
    loanAccountId: loan._id,
    status: { $in: ['pending', 'overdue', 'partial'] },
  }).sort({ sequence: 1 });

  if (pendingEmis.length === 0) {
    throw new APIError('No pending EMIs to restructure', 400, 'NO_PENDING_EMIS');
  }

  // Calculate outstanding principal
  const outstandingPrincipal = pendingEmis.reduce((sum, emi) => {
    const unpaidPrincipal = emi.principalComponent - (emi.paidAmount > emi.interestComponent
      ? emi.paidAmount - emi.interestComponent
      : 0);
    return sum + Math.max(0, unpaidPrincipal);
  }, 0);

  // Store old values for audit
  const oldValues = {
    tenure: loan.tenure,
    interestRate: loan.interestRate,
    emiAmount: loan.emiAmount,
    remainingEmis: pendingEmis.length,
    outstandingPrincipal,
  };

  // Calculate new values
  const finalTenure = newTenure || pendingEmis.length;
  const finalInterestRate = newInterestRate || loan.interestRate;

  // Calculate new EMI using standard formula
  const monthlyRate = finalInterestRate / 12 / 100;
  let newEmiAmount;

  if (monthlyRate > 0) {
    newEmiAmount = (outstandingPrincipal * monthlyRate * Math.pow(1 + monthlyRate, finalTenure)) /
                   (Math.pow(1 + monthlyRate, finalTenure) - 1);
  } else {
    newEmiAmount = outstandingPrincipal / finalTenure;
  }
  newEmiAmount = Math.round(newEmiAmount);

  // Delete old pending EMIs
  await EMI.deleteMany({
    loanAccountId: loan._id,
    status: { $in: ['pending', 'overdue', 'partial'] },
  });

  // Generate new EMI schedule
  const { generateAmortizationSchedule } = require('../utils/emiCalculator');
  const newSchedule = generateAmortizationSchedule({
    principal: outstandingPrincipal,
    interestRate: finalInterestRate,
    tenureMonths: finalTenure,
    startDate: startFromNext ? new Date() : loan.disbursement?.date || new Date(),
  });

  // Get current max sequence
  const lastPaidEmi = await EMI.findOne({
    loanAccountId: loan._id,
    status: 'paid',
  }).sort({ sequence: -1 });

  const startSequence = (lastPaidEmi?.sequence || 0) + 1;

  // Create new EMIs
  const newEmis = newSchedule.map((emi, index) => ({
    loanAccountId: loan._id,
    sequence: startSequence + index,
    dueDate: emi.dueDate,
    amount: newEmiAmount,
    principalComponent: emi.principal,
    interestComponent: emi.interest,
    status: 'pending',
  }));

  await EMI.insertMany(newEmis);

  // Update loan record
  loan.restructured = true;
  loan.restructuredAt = new Date();
  loan.restructuredBy = req.user.userId;
  loan.restructureHistory = loan.restructureHistory || [];
  loan.restructureHistory.push({
    date: new Date(),
    oldTenure: oldValues.tenure,
    newTenure: finalTenure,
    oldInterestRate: oldValues.interestRate,
    newInterestRate: finalInterestRate,
    oldEmi: oldValues.emiAmount,
    newEmi: newEmiAmount,
    outstandingPrincipal,
    reason,
    processedBy: req.user.userId,
  });

  // Update loan fields
  if (newInterestRate) loan.interestRate = finalInterestRate;
  loan.emiAmount = newEmiAmount;
  loan.tenure = (lastPaidEmi?.sequence || 0) + finalTenure;
  loan.outstandingAmount = newSchedule.reduce((sum, emi) => sum + emi.principal + emi.interest, 0);

  // Recalculate next due date
  const nextPendingEmi = await EMI.findOne({
    loanAccountId: loan._id,
    status: 'pending',
  }).sort({ sequence: 1 });

  if (nextPendingEmi) {
    loan.nextDueDate = nextPendingEmi.dueDate;
  }

  // Reset overdue status if applicable
  if (loan.status === 'overdue') {
    loan.status = 'active';
  }

  await loan.save();

  // Audit log
  await AuditLog.logLoan(
    'loan_restructure',
    req.user.userId,
    loan._id,
    `Loan restructured: ${loan.accountNumber}`,
    {
      oldValues,
      newValues: {
        tenure: finalTenure,
        interestRate: finalInterestRate,
        emiAmount: newEmiAmount,
        totalNewEmis: newEmis.length,
      },
      reason,
    }
  );

  res.json({
    success: true,
    message: 'Loan restructured successfully',
    data: {
      loan: {
        accountNumber: loan.accountNumber,
        oldEmi: oldValues.emiAmount,
        newEmi: newEmiAmount,
        oldTenure: oldValues.remainingEmis,
        newTenure: finalTenure,
        oldInterestRate: oldValues.interestRate,
        newInterestRate: finalInterestRate,
        outstandingPrincipal: Math.round(outstandingPrincipal),
        newEmisCreated: newEmis.length,
      },
    },
  });
});

/**
 * @desc    Preview loan restructuring
 * @route   POST /api/loan-accounts/:id/restructure/preview
 * @access  Private/Staff
 */
const previewRestructure = asyncHandler(async (req, res) => {
  const { newTenure, newInterestRate } = req.body;

  if (!newTenure && !newInterestRate) {
    throw new APIError('Either new tenure or new interest rate is required', 400, 'MISSING_PARAMS');
  }

  const loan = await LoanAccount.findById(req.params.id);
  if (!loan || loan.isDeleted) {
    throw new APIError('Loan account not found', 404, 'LOAN_NOT_FOUND');
  }

  // Get pending EMIs
  const pendingEmis = await EMI.find({
    loanAccountId: loan._id,
    status: { $in: ['pending', 'overdue', 'partial'] },
  });

  if (pendingEmis.length === 0) {
    throw new APIError('No pending EMIs to restructure', 400, 'NO_PENDING_EMIS');
  }

  // Calculate outstanding principal
  const outstandingPrincipal = pendingEmis.reduce((sum, emi) => {
    const unpaidPrincipal = emi.principalComponent - (emi.paidAmount > emi.interestComponent
      ? emi.paidAmount - emi.interestComponent
      : 0);
    return sum + Math.max(0, unpaidPrincipal);
  }, 0);

  const finalTenure = newTenure || pendingEmis.length;
  const finalInterestRate = newInterestRate || loan.interestRate;

  // Calculate new EMI
  const monthlyRate = finalInterestRate / 12 / 100;
  let newEmiAmount;

  if (monthlyRate > 0) {
    newEmiAmount = (outstandingPrincipal * monthlyRate * Math.pow(1 + monthlyRate, finalTenure)) /
                   (Math.pow(1 + monthlyRate, finalTenure) - 1);
  } else {
    newEmiAmount = outstandingPrincipal / finalTenure;
  }
  newEmiAmount = Math.round(newEmiAmount);

  // Calculate total payable
  const totalPayable = newEmiAmount * finalTenure;
  const totalInterest = totalPayable - outstandingPrincipal;

  res.json({
    success: true,
    data: {
      current: {
        emiAmount: loan.emiAmount,
        remainingEmis: pendingEmis.length,
        interestRate: loan.interestRate,
        outstandingAmount: loan.outstandingAmount,
      },
      proposed: {
        emiAmount: newEmiAmount,
        tenure: finalTenure,
        interestRate: finalInterestRate,
        outstandingPrincipal: Math.round(outstandingPrincipal),
        totalPayable: Math.round(totalPayable),
        totalInterest: Math.round(totalInterest),
        emiReduction: loan.emiAmount - newEmiAmount,
        emiReductionPercent: Math.round(((loan.emiAmount - newEmiAmount) / loan.emiAmount) * 100),
      },
    },
  });
});

/**
 * @desc    Get overdue loans
 * @route   GET /api/loan-accounts/overdue
 * @access  Private/Staff
 */
const getOverdueLoans = asyncHandler(async (req, res) => {
  const { daysOverdue = 0, page = 1, limit = 20 } = req.query;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - parseInt(daysOverdue));

  const query = {
    status: { $in: ['overdue', 'npa'] },
    isDeleted: false,
  };

  if (daysOverdue > 0) {
    query.nextDueDate = { $lt: cutoffDate };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [loans, total] = await Promise.all([
    LoanAccount.find(query)
      .populate('customerId', 'fullName phone')
      .populate('productId', 'name')
      .sort({ nextDueDate: 1 })
      .skip(skip)
      .limit(parseInt(limit)),
    LoanAccount.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      loans,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

module.exports = {
  getLoanAccounts,
  getLoanAccountById,
  createLoanAccount,
  approveLoan,
  rejectLoan,
  disburseLoan,
  getMyLoans,
  getLoanEMIs,
  getLoanRiskScore,
  closeLoan,
  getOverdueLoans,
  restructureLoan,
  previewRestructure,
};
