// server/src/utils/paymentGateway.js
const crypto = require('crypto');

/**
 * Payment Gateway Service
 * Supports Razorpay and UPI payments
 */

// Razorpay configuration check
const isRazorpayConfigured = () => {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
};

// Initialize Razorpay (lazy load)
let razorpayInstance = null;
const getRazorpay = () => {
  if (!isRazorpayConfigured()) {
    return null;
  }
  if (!razorpayInstance) {
    const Razorpay = require('razorpay');
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
};

/**
 * Create Razorpay order for EMI payment
 */
const createRazorpayOrder = async ({ amount, currency = 'INR', receipt, notes = {} }) => {
  const razorpay = getRazorpay();
  if (!razorpay) {
    throw new Error('Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  }

  const options = {
    amount: Math.round(amount * 100), // Razorpay expects amount in paise
    currency,
    receipt,
    notes,
    payment_capture: 1, // Auto-capture payment
  };

  const order = await razorpay.orders.create(options);
  return {
    orderId: order.id,
    amount: order.amount / 100,
    currency: order.currency,
    receipt: order.receipt,
    status: order.status,
    createdAt: order.created_at,
  };
};

/**
 * Verify Razorpay payment signature
 */
const verifyRazorpayPayment = ({ orderId, paymentId, signature }) => {
  if (!process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay secret not configured');
  }

  const body = orderId + '|' + paymentId;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  return expectedSignature === signature;
};

/**
 * Fetch Razorpay payment details
 */
const fetchRazorpayPayment = async (paymentId) => {
  const razorpay = getRazorpay();
  if (!razorpay) {
    throw new Error('Razorpay is not configured');
  }

  const payment = await razorpay.payments.fetch(paymentId);
  return {
    id: payment.id,
    amount: payment.amount / 100,
    currency: payment.currency,
    status: payment.status,
    method: payment.method,
    email: payment.email,
    contact: payment.contact,
    orderId: payment.order_id,
    description: payment.description,
    bank: payment.bank,
    wallet: payment.wallet,
    vpa: payment.vpa,
    capturedAt: payment.captured_at ? new Date(payment.captured_at * 1000) : null,
  };
};

/**
 * Generate UPI payment link/QR data
 * Uses UPI deep link format
 */
const generateUPIPaymentData = ({
  payeeVPA,
  payeeName,
  amount,
  transactionRef,
  transactionNote
}) => {
  // Default UPI VPA from env or fallback
  const vpa = payeeVPA || process.env.UPI_VPA || 'loansphere@upi';
  const name = payeeName || process.env.UPI_PAYEE_NAME || 'LoanSphere';

  // UPI Intent URL format
  const upiUrl = new URL('upi://pay');
  upiUrl.searchParams.set('pa', vpa); // Payee VPA
  upiUrl.searchParams.set('pn', name); // Payee Name
  upiUrl.searchParams.set('am', amount.toFixed(2)); // Amount
  upiUrl.searchParams.set('cu', 'INR'); // Currency
  upiUrl.searchParams.set('tr', transactionRef); // Transaction Reference
  upiUrl.searchParams.set('tn', transactionNote || `EMI Payment - ${transactionRef}`); // Transaction Note

  return {
    upiUrl: upiUrl.toString(),
    payeeVPA: vpa,
    payeeName: name,
    amount,
    transactionRef,
    // QR code can be generated from upiUrl using any QR library on frontend
    qrData: upiUrl.toString(),
  };
};

/**
 * Generate payment reference number
 */
const generatePaymentRef = (prefix = 'PAY') => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

/**
 * Get available payment methods
 */
const getAvailablePaymentMethods = () => {
  const methods = [
    {
      id: 'upi',
      name: 'UPI',
      description: 'Pay using any UPI app (Google Pay, PhonePe, Paytm, etc.)',
      icon: 'upi',
      enabled: true,
      minAmount: 1,
      maxAmount: 100000,
    },
    {
      id: 'bank_transfer',
      name: 'Bank Transfer / NEFT / IMPS',
      description: 'Transfer directly to our bank account',
      icon: 'bank',
      enabled: true,
      minAmount: 1,
      maxAmount: null,
      bankDetails: {
        bankName: process.env.BANK_NAME || 'HDFC Bank',
        accountName: process.env.BANK_ACCOUNT_NAME || 'LoanSphere Finance Pvt Ltd',
        accountNumber: process.env.BANK_ACCOUNT_NUMBER || 'XXXX XXXX XXXX',
        ifscCode: process.env.BANK_IFSC || 'HDFC0001234',
        branch: process.env.BANK_BRANCH || 'Main Branch',
      },
    },
  ];

  // Add Razorpay if configured
  if (isRazorpayConfigured()) {
    methods.unshift({
      id: 'razorpay',
      name: 'Pay Online',
      description: 'Credit/Debit Card, Net Banking, Wallets, UPI',
      icon: 'card',
      enabled: true,
      minAmount: 1,
      maxAmount: null,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  }

  return methods;
};

/**
 * Payment Gateway Configuration
 */
const getPaymentConfig = () => {
  return {
    razorpay: {
      configured: isRazorpayConfigured(),
      keyId: process.env.RAZORPAY_KEY_ID || null,
    },
    upi: {
      configured: true,
      vpa: process.env.UPI_VPA || 'loansphere@upi',
      payeeName: process.env.UPI_PAYEE_NAME || 'LoanSphere',
    },
    bankTransfer: {
      configured: true,
      bankName: process.env.BANK_NAME || 'HDFC Bank',
      accountNumber: process.env.BANK_ACCOUNT_NUMBER ? '****' + process.env.BANK_ACCOUNT_NUMBER.slice(-4) : 'Not configured',
      ifscCode: process.env.BANK_IFSC || 'Not configured',
    },
  };
};

module.exports = {
  isRazorpayConfigured,
  createRazorpayOrder,
  verifyRazorpayPayment,
  fetchRazorpayPayment,
  generateUPIPaymentData,
  generatePaymentRef,
  getAvailablePaymentMethods,
  getPaymentConfig,
};
