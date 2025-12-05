// server/src/controllers/paymentController.js
const { validationResult } = require('express-validator');
const EMI = require('../models/EMI');
const LoanAccount = require('../models/LoanAccount');
const LoanProduct = require('../models/LoanProduct');
const Customer = require('../models/Customer');
const AuditLog = require('../models/AuditLog');
const { asyncHandler, APIError, createValidationError } = require('../middlewares/errorHandler');
const { calculateLatePenalty } = require('../utils/emiCalculator');

/**
 * @desc    Record EMI payment
 * @route   POST /api/payments/record
 * @access  Private/Staff
 */
const recordPayment = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError(errors);
  }

  const {
    emiId,
    amount,
    paymentDate,
    mode,
    referenceNumber,
    remarks,
    waivePenalty = false,
  } = req.body;

  // Get EMI
  const emi = await EMI.findById(emiId);
  if (!emi) {
    throw new APIError('EMI not found', 404, 'EMI_NOT_FOUND');
  }

  // Check if already paid
  if (emi.status === 'paid') {
    throw new APIError('This EMI has already been paid', 400, 'ALREADY_PAID');
  }

  // Get loan account and product
  const loan = await LoanAccount.findById(emi.loanAccountId);
  if (!loan) {
    throw new APIError('Loan account not found', 404, 'LOAN_NOT_FOUND');
  }

  const product = await LoanProduct.findById(loan.productId);

  // Calculate late penalty if applicable
  const paidDate = new Date(paymentDate || Date.now());
  const daysLate = emi.calculateDaysLate(paidDate);

  let penaltyAmount = 0;
  if (daysLate > 0 && !waivePenalty) {
    penaltyAmount = calculateLatePenalty(emi.amount, daysLate, {
      type: product?.latePenaltyType || 'percentage',
      rate: product?.latePenaltyRate || 2,
      gracePeriod: product?.gracePeriodDays || 0,
    });
  }

  // Calculate total due
  const totalDue = emi.amount + penaltyAmount;

  // Validate payment amount
  if (amount < totalDue && emi.status !== 'partial') {
    // Allow partial payment
    if (amount <= 0) {
      throw new APIError('Payment amount must be positive', 400, 'INVALID_AMOUNT');
    }
  }

  // Record payment
  const paymentResult = await emi.recordPayment({
    amount,
    date: paidDate,
    mode,
    referenceNumber,
    remarks,
    recordedBy: req.user.userId,
    penaltyAmount,
  });

  // Update loan account stats
  await loan.updatePaymentStats();

  // Update customer credit score
  const customer = await Customer.findById(loan.customerId);
  if (customer) {
    await customer.updateStats();
  }

  // Audit log
  await AuditLog.logPayment(
    req.user.userId,
    loan._id,
    emi._id,
    amount,
    {
      sequence: emi.sequence,
      daysLate,
      penaltyAmount,
      mode,
      referenceNumber,
    }
  );

  res.json({
    success: true,
    message: `Payment of ₹${amount} recorded successfully`,
    data: {
      payment: paymentResult,
      loan: {
        accountNumber: loan.accountNumber,
        paidEMIs: loan.paidEMIs,
        outstandingAmount: loan.outstandingAmount,
        nextDueDate: loan.nextDueDate,
        status: loan.status,
      },
    },
  });
});

/**
 * @desc    Record bulk EMI payments
 * @route   POST /api/payments/record-bulk
 * @access  Private/Staff
 */
const recordBulkPayment = asyncHandler(async (req, res) => {
  const { loanAccountId, amount, paymentDate, mode, referenceNumber, remarks } = req.body;

  const loan = await LoanAccount.findById(loanAccountId);
  if (!loan) {
    throw new APIError('Loan account not found', 404, 'LOAN_NOT_FOUND');
  }

  // Get pending/overdue EMIs
  const pendingEmis = await EMI.find({
    loanAccountId,
    status: { $in: ['pending', 'overdue', 'partial'] },
  }).sort({ sequence: 1 });

  if (pendingEmis.length === 0) {
    throw new APIError('No pending EMIs found', 400, 'NO_PENDING_EMIS');
  }

  let remainingAmount = amount;
  const paidEmis = [];
  const paidDate = new Date(paymentDate || Date.now());

  // Pay EMIs in order
  for (const emi of pendingEmis) {
    if (remainingAmount <= 0) break;

    const emiDue = emi.totalDue - emi.paidAmount;

    if (remainingAmount >= emiDue) {
      // Full payment for this EMI
      await emi.recordPayment({
        amount: emiDue,
        date: paidDate,
        mode,
        referenceNumber,
        remarks: `Bulk payment - EMI ${emi.sequence}`,
        recordedBy: req.user.userId,
      });
      paidEmis.push({ sequence: emi.sequence, amount: emiDue, status: 'paid' });
      remainingAmount -= emiDue;
    } else {
      // Partial payment
      await emi.recordPayment({
        amount: remainingAmount,
        date: paidDate,
        mode,
        referenceNumber,
        remarks: `Partial payment - EMI ${emi.sequence}`,
        recordedBy: req.user.userId,
      });
      paidEmis.push({ sequence: emi.sequence, amount: remainingAmount, status: 'partial' });
      remainingAmount = 0;
    }
  }

  // Update loan stats
  await loan.updatePaymentStats();

  // Update customer stats
  const customer = await Customer.findById(loan.customerId);
  if (customer) {
    await customer.updateStats();
  }

  // Audit log
  await AuditLog.log({
    type: 'emi_payment',
    userId: req.user.userId,
    loanAccountId: loan._id,
    message: `Bulk payment recorded: ₹${amount}`,
    amount,
    details: { paidEmis, remainingAmount },
  });

  res.json({
    success: true,
    message: `Payment of ₹${amount} distributed across ${paidEmis.length} EMI(s)`,
    data: {
      paidEmis,
      excessAmount: remainingAmount,
      loan: {
        accountNumber: loan.accountNumber,
        paidEMIs: loan.paidEMIs,
        outstandingAmount: loan.outstandingAmount,
        status: loan.status,
      },
    },
  });
});

/**
 * @desc    Waive EMI penalty
 * @route   POST /api/payments/waive-penalty
 * @access  Private/Admin
 */
const waivePenalty = asyncHandler(async (req, res) => {
  const { emiId, amount, reason } = req.body;

  if (!reason) {
    throw new APIError('Waiver reason is required', 400, 'REASON_REQUIRED');
  }

  const emi = await EMI.findById(emiId);
  if (!emi) {
    throw new APIError('EMI not found', 404, 'EMI_NOT_FOUND');
  }

  if (emi.penaltyAmount === 0) {
    throw new APIError('No penalty to waive', 400, 'NO_PENALTY');
  }

  const waiveAmount = amount || emi.penaltyAmount;

  if (waiveAmount > emi.penaltyAmount - emi.penaltyWaived) {
    throw new APIError('Waiver amount exceeds remaining penalty', 400, 'INVALID_AMOUNT');
  }

  emi.penaltyWaived += waiveAmount;
  emi.waiverAmount = waiveAmount;
  emi.waiverReason = reason;
  emi.waivedBy = req.user.userId;
  await emi.save();

  // Update loan stats
  const loan = await LoanAccount.findById(emi.loanAccountId);
  await loan.updatePaymentStats();

  await AuditLog.log({
    type: 'emi_penalty_waive',
    userId: req.user.userId,
    loanAccountId: loan._id,
    emiId: emi._id,
    message: `Penalty waived: ₹${waiveAmount}`,
    amount: waiveAmount,
    details: { reason },
  });

  res.json({
    success: true,
    message: `Penalty of ₹${waiveAmount} waived successfully`,
    data: { emi },
  });
});

/**
 * @desc    Get payment history for a loan
 * @route   GET /api/payments/history/:loanAccountId
 * @access  Private
 */
const getPaymentHistory = asyncHandler(async (req, res) => {
  const { loanAccountId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  const loan = await LoanAccount.findById(loanAccountId);
  if (!loan) {
    throw new APIError('Loan account not found', 404, 'LOAN_NOT_FOUND');
  }

  // For customers, verify ownership
  if (req.user.role === 'customer') {
    const customer = await Customer.findOne({ userId: req.user.userId });
    if (!customer || loan.customerId.toString() !== customer._id.toString()) {
      throw new APIError('Access denied', 403, 'NOT_OWNER');
    }
  }

  // Get all EMIs with payments
  const emis = await EMI.find({
    loanAccountId,
    paidAmount: { $gt: 0 },
  })
    .sort({ paidDate: -1 })
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  const total = await EMI.countDocuments({
    loanAccountId,
    paidAmount: { $gt: 0 },
  });

  // Format as payment history
  const payments = emis.map((emi) => ({
    emiId: emi._id,
    sequence: emi.sequence,
    dueDate: emi.dueDate,
    paidDate: emi.paidDate,
    amount: emi.paidAmount,
    penaltyAmount: emi.penaltyAmount,
    daysLate: emi.daysLate,
    mode: emi.paymentMode,
    reference: emi.paymentReference,
    status: emi.status,
  }));

  res.json({
    success: true,
    data: {
      loan: {
        accountNumber: loan.accountNumber,
        totalPaid: loan.totalPaid,
        totalPenalty: loan.totalPenalty,
      },
      payments,
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
 * @desc    Get upcoming EMIs
 * @route   GET /api/payments/upcoming
 * @access  Private/Staff
 */
const getUpcomingEMIs = asyncHandler(async (req, res) => {
  const { days = 7, page = 1, limit = 50 } = req.query;

  const emis = await EMI.findUpcoming(parseInt(days));

  // Get unique loan IDs
  const loanIds = [...new Set(emis.map((e) => e.loanAccountId._id.toString()))];

  // Get customer info for each loan
  const loans = await LoanAccount.find({ _id: { $in: loanIds } })
    .populate('customerId', 'fullName phone');

  const loanMap = new Map(loans.map((l) => [l._id.toString(), l]));

  const result = emis.map((emi) => {
    const loan = loanMap.get(emi.loanAccountId._id.toString());
    return {
      emiId: emi._id,
      sequence: emi.sequence,
      dueDate: emi.dueDate,
      amount: emi.amount,
      accountNumber: loan?.accountNumber,
      customerName: loan?.customerId?.fullName,
      customerPhone: loan?.customerId?.phone,
    };
  });

  res.json({
    success: true,
    data: {
      upcomingEmis: result,
      count: result.length,
      daysAhead: parseInt(days),
    },
  });
});

/**
 * @desc    Get overdue EMIs
 * @route   GET /api/payments/overdue
 * @access  Private/Staff
 */
const getOverdueEMIs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [emis, total] = await Promise.all([
    EMI.find({
      status: 'overdue',
    })
      .populate({
        path: 'loanAccountId',
        select: 'accountNumber customerId',
        populate: {
          path: 'customerId',
          select: 'fullName phone',
        },
      })
      .sort({ dueDate: 1 })
      .skip(skip)
      .limit(parseInt(limit)),
    EMI.countDocuments({ status: 'overdue' }),
  ]);

  const result = emis.map((emi) => ({
    emiId: emi._id,
    sequence: emi.sequence,
    dueDate: emi.dueDate,
    amount: emi.amount,
    daysOverdue: Math.floor((new Date() - emi.dueDate) / (1000 * 60 * 60 * 24)),
    accountNumber: emi.loanAccountId?.accountNumber,
    customerName: emi.loanAccountId?.customerId?.fullName,
    customerPhone: emi.loanAccountId?.customerId?.phone,
  }));

  res.json({
    success: true,
    data: {
      overdueEmis: result,
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
 * @desc    Calculate foreclosure amount
 * @route   GET /api/payments/foreclosure/:loanAccountId
 * @access  Private
 */
const getForeclosureAmount = asyncHandler(async (req, res) => {
  const loan = await LoanAccount.findById(req.params.loanAccountId)
    .populate('productId');

  if (!loan) {
    throw new APIError('Loan account not found', 404, 'LOAN_NOT_FOUND');
  }

  if (!loan.canForeclose()) {
    throw new APIError(
      'This loan cannot be foreclosed',
      400,
      'CANNOT_FORECLOSE'
    );
  }

  // Get pending EMIs
  const pendingEmis = await EMI.find({
    loanAccountId: loan._id,
    status: { $in: ['pending', 'overdue', 'partial'] },
  });

  // Calculate outstanding amounts
  const outstandingPrincipal = pendingEmis.reduce(
    (sum, e) => sum + e.principalComponent,
    0
  );
  const outstandingInterest = pendingEmis.reduce(
    (sum, e) => sum + (e.interestComponent * 0.5), // Typically 50% interest rebate on foreclosure
    0
  );
  const pendingPenalty = pendingEmis.reduce(
    (sum, e) => sum + (e.penaltyAmount - e.penaltyPaid - e.penaltyWaived),
    0
  );

  // Prepayment penalty
  const prepaymentPenalty = loan.productId?.prepaymentAllowed
    ? (outstandingPrincipal * (loan.productId?.prepaymentPenaltyRate || 0)) / 100
    : 0;

  const totalForeclosure = outstandingPrincipal + outstandingInterest + pendingPenalty + prepaymentPenalty;

  res.json({
    success: true,
    data: {
      loan: {
        accountNumber: loan.accountNumber,
        originalPrincipal: loan.principal,
        paidEMIs: loan.paidEMIs,
        remainingEMIs: loan.unpaidEMIs,
      },
      foreclosure: {
        outstandingPrincipal: Math.round(outstandingPrincipal * 100) / 100,
        outstandingInterest: Math.round(outstandingInterest * 100) / 100,
        pendingPenalty: Math.round(pendingPenalty * 100) / 100,
        prepaymentPenalty: Math.round(prepaymentPenalty * 100) / 100,
        totalAmount: Math.round(totalForeclosure * 100) / 100,
        interestRebate: '50% on remaining interest',
      },
      calculatedAt: new Date(),
    },
  });
});

/**
 * @desc    Process foreclosure payment
 * @route   POST /api/payments/foreclosure/:loanAccountId
 * @access  Private/Staff
 */
const processForeclosure = asyncHandler(async (req, res) => {
  const {
    amount,
    paymentDate,
    mode,
    referenceNumber,
    remarks,
  } = req.body;

  const loan = await LoanAccount.findById(req.params.loanAccountId);
  if (!loan) {
    throw new APIError('Loan account not found', 404, 'LOAN_NOT_FOUND');
  }

  if (!loan.canForeclose()) {
    throw new APIError('This loan cannot be foreclosed', 400, 'CANNOT_FORECLOSE');
  }

  // Mark all pending EMIs as paid (with foreclosure flag)
  await EMI.updateMany(
    {
      loanAccountId: loan._id,
      status: { $in: ['pending', 'overdue', 'partial'] },
    },
    {
      $set: {
        status: 'paid',
        paidDate: new Date(paymentDate || Date.now()),
        paymentMode: mode,
        paymentReference: referenceNumber,
        remarks: 'Foreclosure payment',
      },
    }
  );

  // Close the loan
  loan.status = 'foreclosed';
  loan.closureDate = new Date();
  loan.closureType = 'foreclosure';
  loan.closureRemarks = remarks;
  loan.closedBy = req.user.userId;
  loan.outstandingPrincipal = 0;
  loan.outstandingAmount = 0;
  loan.totalPaid += amount;
  await loan.save();

  // Update customer stats
  const customer = await Customer.findById(loan.customerId);
  if (customer) {
    await customer.updateStats();
  }

  await AuditLog.log({
    type: 'loan_foreclose',
    userId: req.user.userId,
    loanAccountId: loan._id,
    message: `Loan foreclosed: ${loan.accountNumber}`,
    amount,
    details: { mode, referenceNumber },
  });

  res.json({
    success: true,
    message: 'Loan foreclosed successfully',
    data: { loan },
  });
});

/**
 * @desc    Mark EMIs as overdue (scheduled job endpoint)
 * @route   POST /api/payments/mark-overdue
 * @access  Private/Admin
 */
const markOverdueEMIs = asyncHandler(async (req, res) => {
  const count = await EMI.markOverdueEMIs();

  // Update loan statuses
  const overdueLoans = await LoanAccount.find({
    status: 'active',
    nextDueDate: { $lt: new Date() },
  });

  for (const loan of overdueLoans) {
    await loan.updatePaymentStats();
  }

  res.json({
    success: true,
    message: `Marked ${count} EMIs as overdue`,
    data: { markedCount: count, loansUpdated: overdueLoans.length },
  });
});

module.exports = {
  recordPayment,
  recordBulkPayment,
  waivePenalty,
  getPaymentHistory,
  getUpcomingEMIs,
  getOverdueEMIs,
  getForeclosureAmount,
  processForeclosure,
  markOverdueEMIs,
};
