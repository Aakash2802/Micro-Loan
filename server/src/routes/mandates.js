// server/src/routes/mandates.js
const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

const {
  getMyMandates,
  createMandate,
  getMandateById,
  cancelMandate,
  getAllMandates,
  updateMandateStatus,
  getSupportedBanks,
  executeMandate,
} = require('../controllers/mandateController');

const { authMiddleware } = require('../middlewares/authMiddleware');
const { staffOnly, customerOnly } = require('../middlewares/roleMiddleware');

// Validation rules
const createMandateValidation = [
  body('loanAccountId')
    .notEmpty().withMessage('Loan account ID is required')
    .isMongoId().withMessage('Invalid loan account ID'),
  body('accountHolderName')
    .notEmpty().withMessage('Account holder name is required')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('bankName')
    .notEmpty().withMessage('Bank name is required')
    .trim(),
  body('accountNumber')
    .notEmpty().withMessage('Account number is required')
    .matches(/^\d{9,18}$/).withMessage('Invalid account number'),
  body('ifscCode')
    .notEmpty().withMessage('IFSC code is required')
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/i).withMessage('Invalid IFSC code format'),
  body('accountType')
    .optional()
    .isIn(['savings', 'current']).withMessage('Invalid account type'),
  body('debitDay')
    .optional()
    .isInt({ min: 1, max: 28 }).withMessage('Debit day must be between 1 and 28'),
  body('consent')
    .equals('true').withMessage('Consent is required'),
];

const objectIdValidation = [
  param('id').isMongoId().withMessage('Invalid ID format'),
];

const statusUpdateValidation = [
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['initiated', 'approved', 'active', 'suspended', 'cancelled', 'rejected'])
    .withMessage('Invalid status'),
  body('reason')
    .optional()
    .trim(),
];

// Public route
router.get('/banks', getSupportedBanks);

// Customer routes
router.get('/my-mandates', authMiddleware, customerOnly, getMyMandates);
router.post('/', authMiddleware, customerOnly, createMandateValidation, createMandate);
router.post('/:id/cancel', authMiddleware, objectIdValidation, cancelMandate);

// Shared route (customers & staff)
router.get('/:id', authMiddleware, objectIdValidation, getMandateById);

// Staff routes
router.get('/', authMiddleware, staffOnly, getAllMandates);
router.patch('/:id/status', authMiddleware, staffOnly, objectIdValidation, statusUpdateValidation, updateMandateStatus);
router.post('/:id/execute', authMiddleware, staffOnly, objectIdValidation, executeMandate);

module.exports = router;
