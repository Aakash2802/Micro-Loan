// server/src/routes/payments.js
const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

const {
  recordPayment,
  recordBulkPayment,
  waivePenalty,
  getPaymentHistory,
  getUpcomingEMIs,
  getOverdueEMIs,
  getForeclosureAmount,
  processForeclosure,
  markOverdueEMIs,
} = require('../controllers/paymentController');

const { authMiddleware } = require('../middlewares/authMiddleware');
const { staffOnly, adminOnly } = require('../middlewares/roleMiddleware');
const { writeLimiter } = require('../middlewares/rateLimit');

// Validation rules
const recordPaymentValidation = [
  body('emiId')
    .notEmpty().withMessage('EMI ID is required')
    .isMongoId().withMessage('Invalid EMI ID'),
  body('amount')
    .notEmpty().withMessage('Payment amount is required')
    .isFloat({ min: 1 }).withMessage('Amount must be positive'),
  body('paymentDate')
    .optional()
    .isISO8601().withMessage('Invalid date format'),
  body('mode')
    .notEmpty().withMessage('Payment mode is required')
    .isIn(['cash', 'cheque', 'bank_transfer', 'upi', 'card', 'auto_debit', 'online'])
    .withMessage('Invalid payment mode'),
  body('referenceNumber')
    .optional()
    .trim(),
  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Remarks cannot exceed 500 characters'),
  body('waivePenalty')
    .optional()
    .isBoolean().withMessage('waivePenalty must be boolean'),
];

const bulkPaymentValidation = [
  body('loanAccountId')
    .notEmpty().withMessage('Loan account ID is required')
    .isMongoId().withMessage('Invalid loan account ID'),
  body('amount')
    .notEmpty().withMessage('Payment amount is required')
    .isFloat({ min: 1 }).withMessage('Amount must be positive'),
  body('paymentDate')
    .optional()
    .isISO8601().withMessage('Invalid date format'),
  body('mode')
    .notEmpty().withMessage('Payment mode is required')
    .isIn(['cash', 'cheque', 'bank_transfer', 'upi', 'card', 'auto_debit', 'online']),
];

const waivePenaltyValidation = [
  body('emiId')
    .notEmpty().withMessage('EMI ID is required')
    .isMongoId().withMessage('Invalid EMI ID'),
  body('amount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Amount must be non-negative'),
  body('reason')
    .notEmpty().withMessage('Waiver reason is required')
    .trim()
    .isLength({ min: 10, max: 500 }).withMessage('Reason must be 10-500 characters'),
];

const foreclosureValidation = [
  body('amount')
    .notEmpty().withMessage('Foreclosure amount is required')
    .isFloat({ min: 1 }).withMessage('Amount must be positive'),
  body('paymentDate')
    .optional()
    .isISO8601().withMessage('Invalid date format'),
  body('mode')
    .notEmpty().withMessage('Payment mode is required')
    .isIn(['cash', 'cheque', 'bank_transfer', 'upi', 'card']),
  body('referenceNumber')
    .optional()
    .trim(),
];

const objectIdValidation = [
  param('loanAccountId').isMongoId().withMessage('Invalid loan account ID'),
];

// Staff routes
router.post('/record', authMiddleware, staffOnly, writeLimiter, recordPaymentValidation, recordPayment);
router.post('/record-bulk', authMiddleware, staffOnly, writeLimiter, bulkPaymentValidation, recordBulkPayment);
router.post('/waive-penalty', authMiddleware, adminOnly, waivePenaltyValidation, waivePenalty);

// EMI listing routes
router.get('/upcoming', authMiddleware, staffOnly, getUpcomingEMIs);
router.get('/overdue', authMiddleware, staffOnly, getOverdueEMIs);

// Payment history
router.get('/history/:loanAccountId', authMiddleware, objectIdValidation, getPaymentHistory);

// Foreclosure routes
router.get('/foreclosure/:loanAccountId', authMiddleware, objectIdValidation, getForeclosureAmount);
router.post('/foreclosure/:loanAccountId', authMiddleware, staffOnly, objectIdValidation, foreclosureValidation, processForeclosure);

// Admin: Mark overdue EMIs (for scheduled job)
router.post('/mark-overdue', authMiddleware, adminOnly, markOverdueEMIs);

module.exports = router;
