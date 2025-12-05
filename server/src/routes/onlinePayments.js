// server/src/routes/onlinePayments.js
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  getPaymentMethods,
  getPendingEMIs,
  createPaymentOrder,
  verifyPayment,
  generateUPIPayment,
  submitUPIPayment,
  getBankDetails,
  getCustomerPaymentHistory,
} = require('../controllers/onlinePaymentController');

const { authMiddleware } = require('../middlewares/authMiddleware');
const { customerOnly } = require('../middlewares/roleMiddleware');

// Validation rules
const createOrderValidation = [
  body('emiIds')
    .isArray({ min: 1 }).withMessage('At least one EMI ID is required')
    .custom((arr) => arr.every(id => /^[0-9a-fA-F]{24}$/.test(id)))
    .withMessage('Invalid EMI ID format'),
  body('amount')
    .optional()
    .isFloat({ min: 1 }).withMessage('Amount must be at least ₹1'),
];

const verifyPaymentValidation = [
  body('razorpay_order_id')
    .notEmpty().withMessage('Order ID is required'),
  body('razorpay_payment_id')
    .notEmpty().withMessage('Payment ID is required'),
  body('razorpay_signature')
    .notEmpty().withMessage('Signature is required'),
  body('emiIds')
    .isArray({ min: 1 }).withMessage('EMI IDs are required'),
];

const upiGenerateValidation = [
  body('emiIds')
    .isArray({ min: 1 }).withMessage('At least one EMI ID is required'),
  body('amount')
    .optional()
    .isFloat({ min: 1 }).withMessage('Amount must be at least ₹1'),
];

const upiSubmitValidation = [
  body('emiIds')
    .isArray({ min: 1 }).withMessage('EMI IDs are required'),
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 1 }).withMessage('Amount must be at least ₹1'),
  body('upiTransactionId')
    .notEmpty().withMessage('UPI Transaction ID is required')
    .trim()
    .isLength({ min: 5, max: 50 }).withMessage('Invalid transaction ID'),
  body('paymentRef')
    .optional()
    .trim(),
];

// All routes require customer authentication
router.use(authMiddleware, customerOnly);

// Get available payment methods
router.get('/methods', getPaymentMethods);

// Get customer's pending EMIs
router.get('/pending-emis', getPendingEMIs);

// Get payment history
router.get('/history', getCustomerPaymentHistory);

// Bank transfer details
router.get('/bank-details', getBankDetails);

// Razorpay routes
router.post('/razorpay/create-order', createOrderValidation, createPaymentOrder);
router.post('/razorpay/verify', verifyPaymentValidation, verifyPayment);

// UPI routes
router.post('/upi/generate', upiGenerateValidation, generateUPIPayment);
router.post('/upi/submit', upiSubmitValidation, submitUPIPayment);

module.exports = router;
