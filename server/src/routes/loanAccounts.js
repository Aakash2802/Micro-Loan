// server/src/routes/loanAccounts.js
const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

const {
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
} = require('../controllers/loanAccountController');

const { authMiddleware } = require('../middlewares/authMiddleware');
const { staffOnly, customerOnly } = require('../middlewares/roleMiddleware');

// Validation rules
const createLoanValidation = [
  body('customerId')
    .notEmpty().withMessage('Customer ID is required')
    .isMongoId().withMessage('Invalid customer ID'),
  body('productId')
    .notEmpty().withMessage('Product ID is required')
    .isMongoId().withMessage('Invalid product ID'),
  body('principal')
    .notEmpty().withMessage('Principal amount is required')
    .isFloat({ min: 1000 }).withMessage('Principal must be at least ₹1,000'),
  body('tenureMonths')
    .notEmpty().withMessage('Tenure is required')
    .isInt({ min: 1 }).withMessage('Tenure must be at least 1 month'),
  body('startDate')
    .optional()
    .isISO8601().withMessage('Invalid date format'),
  body('purpose')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Purpose cannot exceed 500 characters'),
];

const disburseValidation = [
  body('amount')
    .notEmpty().withMessage('Disbursement amount is required')
    .isFloat({ min: 1 }).withMessage('Amount must be positive'),
  body('mode')
    .notEmpty().withMessage('Payment mode is required')
    .isIn(['bank_transfer', 'cheque', 'cash', 'upi']).withMessage('Invalid payment mode'),
  body('referenceNumber')
    .optional()
    .trim(),
];

const closeValidation = [
  body('closureType')
    .notEmpty().withMessage('Closure type is required')
    .isIn(['regular', 'foreclosure', 'settlement', 'write_off']).withMessage('Invalid closure type'),
  body('remarks')
    .optional()
    .trim(),
];

const restructureValidation = [
  body('newTenure')
    .optional()
    .isInt({ min: 1, max: 360 }).withMessage('Tenure must be between 1 and 360 months'),
  body('newInterestRate')
    .optional()
    .isFloat({ min: 0, max: 50 }).withMessage('Interest rate must be between 0% and 50%'),
  body('reason')
    .notEmpty().withMessage('Restructuring reason is required')
    .trim()
    .isLength({ min: 10, max: 500 }).withMessage('Reason must be 10-500 characters'),
];

const objectIdValidation = [
  param('id').isMongoId().withMessage('Invalid ID format'),
];

// Customer routes
router.get('/my-loans', authMiddleware, customerOnly, getMyLoans);

// Staff routes
router.get('/overdue', authMiddleware, staffOnly, getOverdueLoans);
router.get('/', authMiddleware, staffOnly, getLoanAccounts);
router.post('/', authMiddleware, staffOnly, createLoanValidation, createLoanAccount);

// Single loan routes
router.get('/:id', authMiddleware, objectIdValidation, getLoanAccountById);
router.get('/:id/emis', authMiddleware, objectIdValidation, getLoanEMIs);
router.get('/:id/risk-score', authMiddleware, staffOnly, objectIdValidation, getLoanRiskScore);

// Loan lifecycle routes (staff only)
router.patch('/:id/approve', authMiddleware, staffOnly, objectIdValidation, approveLoan);
router.patch('/:id/reject', authMiddleware, staffOnly, objectIdValidation, rejectLoan);
router.post('/:id/disburse', authMiddleware, staffOnly, objectIdValidation, disburseValidation, disburseLoan);
router.post('/:id/close', authMiddleware, staffOnly, objectIdValidation, closeValidation, closeLoan);

// Loan restructuring routes (staff only)
router.post('/:id/restructure/preview', authMiddleware, staffOnly, objectIdValidation, previewRestructure);
router.post('/:id/restructure', authMiddleware, staffOnly, objectIdValidation, restructureValidation, restructureLoan);

module.exports = router;
