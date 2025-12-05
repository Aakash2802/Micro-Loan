// server/src/controllers/onlinePaymentController.js
const EMI = require('../models/EMI');
const LoanAccount = require('../models/LoanAccount');
const Customer = require('../models/Customer');
const AuditLog = require('../models/AuditLog');
const { asyncHandler, APIError } = require('../middlewares/errorHandler');
const {
  createRazorpayOrder,
  verifyRazorpayPayment,
  fetchRazorpayPayment,
  generateUPIPaymentData,
  generatePaymentRef,
  getAvailablePaymentMethods,
  getPaymentConfig,
  isRazorpayConfigured,
} = require('../utils/paymentGateway');
const { sendEmail } = require('../utils/emailService');

/**
 * @desc    Get available payment methods
 * @route   GET /api/online-payments/methods
 * @access  Private/Customer
 */
const getPaymentMethods = asyncHandler(async (req, res) => {
  const methods = getAvailablePaymentMethods();
  const config = getPaymentConfig();

  res.json({
    success: true,
    data: {
      methods,
      config: {
        razorpayConfigured: config.razorpay.configured,
        razorpayKeyId: config.razorpay.keyId,
      },
    },
  });
});

/**
 * @desc    Get customer's pending EMIs for payment
 * @route   GET /api/online-payments/pending-emis
 * @access  Private/Customer
 */
const getPendingEMIs = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ userId: req.user.userId });
  if (!customer) {
    throw new APIError('Customer profile not found', 404, 'PROFILE_NOT_FOUND');
  }

  // Get customer's active loans
  const loans = await LoanAccount.find({
    customerId: customer._id,
    status: { $in: ['active', 'overdue'] },
  }).populate('productId', 'name code latePenaltyRate gracePeriodDays');

  if (loans.length === 0) {
    return res.json({
      success: true,
      data: {
        loans: [],
        totalDue: 0,
      },
    });
  }

  // Get pending EMIs for each loan
  const loansWithEmis = await Promise.all(
    loans.map(async (loan) => {
      const pendingEmis = await EMI.find({
        loanAccountId: loan._id,
        status: { $in: ['pending', 'overdue', 'partial'] },
      }).sort({ sequence: 1 }).limit(3); // Get next 3 pending EMIs

      const totalDue = pendingEmis.reduce((sum, emi) => {
        const due = emi.amount + (emi.penaltyAmount || 0) - (emi.paidAmount || 0);
        return sum + due;
      }, 0);

      return {
        loanId: loan._id,
        accountNumber: loan.accountNumber,
        productName: loan.productId?.name || 'Loan',
        status: loan.status,
        nextDueDate: loan.nextDueDate,
        emiAmount: loan.emiAmount,
        pendingEmis: pendingEmis.map((emi) => ({
          emiId: emi._id,
          sequence: emi.sequence,
          dueDate: emi.dueDate,
          amount: emi.amount,
          penaltyAmount: emi.penaltyAmount || 0,
          paidAmount: emi.paidAmount || 0,
          totalDue: emi.amount + (emi.penaltyAmount || 0) - (emi.paidAmount || 0),
          status: emi.status,
          isOverdue: emi.status === 'overdue',
          daysOverdue: emi.status === 'overdue'
            ? Math.floor((new Date() - new Date(emi.dueDate)) / (1000 * 60 * 60 * 24))
            : 0,
        })),
        totalDue,
      };
    })
  );

  const grandTotal = loansWithEmis.reduce((sum, loan) => sum + loan.totalDue, 0);

  res.json({
    success: true,
    data: {
      loans: loansWithEmis,
      totalDue: grandTotal,
    },
  });
});

/**
 * @desc    Initiate Razorpay payment
 * @route   POST /api/online-payments/razorpay/create-order
 * @access  Private/Customer
 */
const createPaymentOrder = asyncHandler(async (req, res) => {
  const { emiIds, amount } = req.body;

  if (!isRazorpayConfigured()) {
    throw new APIError('Online payment is not available at the moment', 503, 'RAZORPAY_NOT_CONFIGURED');
  }

  const customer = await Customer.findOne({ userId: req.user.userId });
  if (!customer) {
    throw new APIError('Customer profile not found', 404, 'PROFILE_NOT_FOUND');
  }

  // Validate EMIs belong to customer
  const emis = await EMI.find({
    _id: { $in: emiIds },
    status: { $in: ['pending', 'overdue', 'partial'] },
  }).populate('loanAccountId');

  if (emis.length === 0) {
    throw new APIError('No valid EMIs found for payment', 400, 'NO_VALID_EMIS');
  }

  // Verify customer owns these EMIs
  for (const emi of emis) {
    const loan = await LoanAccount.findById(emi.loanAccountId);
    if (loan.customerId.toString() !== customer._id.toString()) {
      throw new APIError('Unauthorized access to EMI', 403, 'NOT_OWNER');
    }
  }

  // Calculate total amount
  const calculatedAmount = emis.reduce((sum, emi) => {
    return sum + emi.amount + (emi.penaltyAmount || 0) - (emi.paidAmount || 0);
  }, 0);

  // Use provided amount or calculated amount
  const paymentAmount = amount || calculatedAmount;

  if (paymentAmount < 1) {
    throw new APIError('Payment amount must be at least ₹1', 400, 'INVALID_AMOUNT');
  }

  // Generate receipt number
  const receipt = generatePaymentRef('RZP');

  // Create Razorpay order
  const order = await createRazorpayOrder({
    amount: paymentAmount,
    receipt,
    notes: {
      customerId: customer._id.toString(),
      customerName: customer.fullName,
      emiIds: emiIds.join(','),
      type: 'emi_payment',
    },
  });

  // Store order details for verification later
  // In production, you might want to store this in a Payment collection

  res.json({
    success: true,
    data: {
      order,
      key: process.env.RAZORPAY_KEY_ID,
      customer: {
        name: customer.fullName,
        email: customer.email,
        phone: customer.phone,
      },
      prefill: {
        name: customer.fullName,
        email: customer.email,
        contact: customer.phone,
      },
    },
  });
});

/**
 * @desc    Verify Razorpay payment
 * @route   POST /api/online-payments/razorpay/verify
 * @access  Private/Customer
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, emiIds } = req.body;

  // Verify signature
  const isValid = verifyRazorpayPayment({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });

  if (!isValid) {
    throw new APIError('Payment verification failed', 400, 'INVALID_SIGNATURE');
  }

  // Fetch payment details from Razorpay
  const payment = await fetchRazorpayPayment(razorpay_payment_id);

  if (payment.status !== 'captured') {
    throw new APIError('Payment not captured', 400, 'PAYMENT_NOT_CAPTURED');
  }

  const customer = await Customer.findOne({ userId: req.user.userId });

  // Record payments for EMIs
  const emis = await EMI.find({ _id: { $in: emiIds } });
  let remainingAmount = payment.amount;
  const paidEmis = [];

  for (const emi of emis) {
    if (remainingAmount <= 0) break;

    const emiDue = emi.amount + (emi.penaltyAmount || 0) - (emi.paidAmount || 0);

    if (remainingAmount >= emiDue) {
      // Full payment for this EMI
      emi.status = 'paid';
      emi.paidDate = new Date();
      emi.paidAmount = (emi.paidAmount || 0) + emiDue;
      emi.paymentMode = 'online';
      emi.paymentReference = razorpay_payment_id;
      remainingAmount -= emiDue;
      paidEmis.push({ emiId: emi._id, sequence: emi.sequence, amount: emiDue, status: 'paid' });
    } else {
      // Partial payment
      emi.status = 'partial';
      emi.paidAmount = (emi.paidAmount || 0) + remainingAmount;
      emi.paymentMode = 'online';
      emi.paymentReference = razorpay_payment_id;
      paidEmis.push({ emiId: emi._id, sequence: emi.sequence, amount: remainingAmount, status: 'partial' });
      remainingAmount = 0;
    }

    await emi.save();

    // Update loan stats
    const loan = await LoanAccount.findById(emi.loanAccountId);
    await loan.updatePaymentStats();
  }

  // Update customer stats
  await customer.updateStats();

  // Audit log
  await AuditLog.log({
    type: 'online_payment',
    userId: req.user.userId,
    message: `Online payment received: ₹${payment.amount}`,
    amount: payment.amount,
    details: {
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      method: payment.method,
      paidEmis,
    },
  });

  // Send payment confirmation email
  if (customer.email) {
    sendEmail(customer.email, 'paymentReceived', {
      customerName: customer.fullName,
      amount: payment.amount,
      paymentId: razorpay_payment_id,
      date: new Date().toLocaleDateString('en-IN'),
      paidEmis,
    }).catch((err) => console.error('[Email] Failed to send payment confirmation:', err));
  }

  res.json({
    success: true,
    message: 'Payment verified and recorded successfully',
    data: {
      payment: {
        id: razorpay_payment_id,
        amount: payment.amount,
        method: payment.method,
        status: 'success',
      },
      paidEmis,
      remainingAmount,
    },
  });
});

/**
 * @desc    Generate UPI payment data
 * @route   POST /api/online-payments/upi/generate
 * @access  Private/Customer
 */
const generateUPIPayment = asyncHandler(async (req, res) => {
  const { emiIds, amount } = req.body;

  const customer = await Customer.findOne({ userId: req.user.userId });
  if (!customer) {
    throw new APIError('Customer profile not found', 404, 'PROFILE_NOT_FOUND');
  }

  // Validate EMIs belong to customer
  const emis = await EMI.find({
    _id: { $in: emiIds },
    status: { $in: ['pending', 'overdue', 'partial'] },
  });

  if (emis.length === 0) {
    throw new APIError('No valid EMIs found', 400, 'NO_VALID_EMIS');
  }

  // Verify ownership
  for (const emi of emis) {
    const loan = await LoanAccount.findById(emi.loanAccountId);
    if (loan.customerId.toString() !== customer._id.toString()) {
      throw new APIError('Unauthorized', 403, 'NOT_OWNER');
    }
  }

  // Calculate amount
  const calculatedAmount = emis.reduce((sum, emi) => {
    return sum + emi.amount + (emi.penaltyAmount || 0) - (emi.paidAmount || 0);
  }, 0);

  const paymentAmount = amount || calculatedAmount;
  const transactionRef = generatePaymentRef('UPI');

  // Get loan account number for reference
  const loan = await LoanAccount.findById(emis[0].loanAccountId);

  const upiData = generateUPIPaymentData({
    amount: paymentAmount,
    transactionRef,
    transactionNote: `EMI Payment - ${loan.accountNumber}`,
  });

  res.json({
    success: true,
    data: {
      upi: upiData,
      paymentRef: transactionRef,
      amount: paymentAmount,
      emiIds,
      instructions: [
        'Open any UPI app (Google Pay, PhonePe, Paytm, etc.)',
        'Scan the QR code or use the UPI ID shown',
        'Enter the exact amount shown',
        'Complete the payment',
        'Save the transaction ID and submit for verification',
      ],
    },
  });
});

/**
 * @desc    Submit UPI payment for verification (manual)
 * @route   POST /api/online-payments/upi/submit
 * @access  Private/Customer
 */
const submitUPIPayment = asyncHandler(async (req, res) => {
  const { emiIds, amount, upiTransactionId, paymentRef } = req.body;

  if (!upiTransactionId) {
    throw new APIError('UPI Transaction ID is required', 400, 'TRANSACTION_ID_REQUIRED');
  }

  const customer = await Customer.findOne({ userId: req.user.userId });
  if (!customer) {
    throw new APIError('Customer profile not found', 404, 'PROFILE_NOT_FOUND');
  }

  // Validate EMIs
  const emis = await EMI.find({
    _id: { $in: emiIds },
    status: { $in: ['pending', 'overdue', 'partial'] },
  });

  if (emis.length === 0) {
    throw new APIError('No valid EMIs found', 400, 'NO_VALID_EMIS');
  }

  // Get loan for audit log
  const loan = await LoanAccount.findById(emis[0].loanAccountId);

  // Create pending payment record for staff verification
  // In production, you'd store this in a PendingPayment collection

  await AuditLog.log({
    type: 'upi_payment_submitted',
    userId: req.user.userId,
    loanAccountId: loan._id,
    message: `UPI payment submitted for verification: ₹${amount}`,
    amount,
    details: {
      upiTransactionId,
      paymentRef,
      emiIds,
      customerName: customer.fullName,
      customerPhone: customer.phone,
      status: 'pending_verification',
    },
  });

  res.json({
    success: true,
    message: 'Payment submitted for verification. Our team will verify and update within 24 hours.',
    data: {
      paymentRef,
      upiTransactionId,
      amount,
      status: 'pending_verification',
      emiIds,
    },
  });
});

/**
 * @desc    Get bank transfer details
 * @route   GET /api/online-payments/bank-details
 * @access  Private/Customer
 */
const getBankDetails = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ userId: req.user.userId });
  if (!customer) {
    throw new APIError('Customer profile not found', 404, 'PROFILE_NOT_FOUND');
  }

  // Get customer's loans for reference
  const loans = await LoanAccount.find({
    customerId: customer._id,
    status: { $in: ['active', 'overdue'] },
  }).select('accountNumber');

  res.json({
    success: true,
    data: {
      bankDetails: {
        bankName: process.env.BANK_NAME || 'HDFC Bank',
        accountName: process.env.BANK_ACCOUNT_NAME || 'LoanSphere Finance Pvt Ltd',
        accountNumber: process.env.BANK_ACCOUNT_NUMBER || 'Contact support for details',
        ifscCode: process.env.BANK_IFSC || 'HDFC0001234',
        branch: process.env.BANK_BRANCH || 'Main Branch',
      },
      instructions: [
        'Transfer the EMI amount to the above bank account',
        `Use your loan account number as payment reference: ${loans.map(l => l.accountNumber).join(' / ')}`,
        'Payment will be credited within 1-2 business days',
        'Keep the transaction receipt for your records',
      ],
      loanAccounts: loans.map(l => l.accountNumber),
    },
  });
});

/**
 * @desc    Get payment history for customer
 * @route   GET /api/online-payments/history
 * @access  Private/Customer
 */
const getCustomerPaymentHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const customer = await Customer.findOne({ userId: req.user.userId });
  if (!customer) {
    throw new APIError('Customer profile not found', 404, 'PROFILE_NOT_FOUND');
  }

  // Get customer's loans
  const loans = await LoanAccount.find({ customerId: customer._id });
  const loanIds = loans.map(l => l._id);

  // Get paid EMIs
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [payments, total] = await Promise.all([
    EMI.find({
      loanAccountId: { $in: loanIds },
      status: 'paid',
    })
      .populate('loanAccountId', 'accountNumber')
      .sort({ paidDate: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    EMI.countDocuments({
      loanAccountId: { $in: loanIds },
      status: 'paid',
    }),
  ]);

  res.json({
    success: true,
    data: {
      payments: payments.map(emi => ({
        id: emi._id,
        loanAccount: emi.loanAccountId?.accountNumber,
        sequence: emi.sequence,
        amount: emi.paidAmount,
        penaltyPaid: emi.penaltyAmount || 0,
        paidDate: emi.paidDate,
        mode: emi.paymentMode,
        reference: emi.paymentReference,
      })),
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
  getPaymentMethods,
  getPendingEMIs,
  createPaymentOrder,
  verifyPayment,
  generateUPIPayment,
  submitUPIPayment,
  getBankDetails,
  getCustomerPaymentHistory,
};
