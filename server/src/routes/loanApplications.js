// server/src/routes/loanApplications.js
const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

const {
  getAvailableProducts,
  checkEligibility,
  submitApplication,
  getMyApplications,
  getMyApplicationById,
  getApplications,
  getApplicationById,
  reviewApplication,
  getApprovalConfig,
} = require('../controllers/loanApplicationController');

const { authMiddleware } = require('../middlewares/authMiddleware');
const { staffOnly, customerOnly } = require('../middlewares/roleMiddleware');

// Validation rules
const submitApplicationValidation = [
  body('productId')
    .notEmpty().withMessage('Product ID is required')
    .isMongoId().withMessage('Invalid product ID'),
  body('requestedAmount')
    .notEmpty().withMessage('Loan amount is required')
    .isFloat({ min: 1000 }).withMessage('Amount must be at least ₹1,000'),
  body('requestedTenure')
    .notEmpty().withMessage('Tenure is required')
    .isInt({ min: 1, max: 360 }).withMessage('Tenure must be between 1 and 360 months'),
  body('purpose')
    .notEmpty().withMessage('Purpose is required')
    .trim()
    .isLength({ min: 10, max: 500 }).withMessage('Purpose must be 10-500 characters'),
];

const checkEligibilityValidation = [
  body('productId')
    .notEmpty().withMessage('Product ID is required')
    .isMongoId().withMessage('Invalid product ID'),
  body('requestedAmount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 1 }).withMessage('Amount must be positive'),
  body('requestedTenure')
    .notEmpty().withMessage('Tenure is required')
    .isInt({ min: 1 }).withMessage('Tenure must be at least 1 month'),
];

const reviewValidation = [
  body('action')
    .notEmpty().withMessage('Action is required')
    .isIn(['approve', 'reject', 'under_review', 'recommend']).withMessage('Invalid action'),
  body('remarks')
    .optional()
    .trim(),
  body('rejectionReason')
    .optional()
    .trim(),
];

const objectIdValidation = [
  param('id').isMongoId().withMessage('Invalid ID format'),
];

// Customer routes (must be before /:id routes)
router.get('/products', authMiddleware, customerOnly, getAvailableProducts);
router.post('/check-eligibility', authMiddleware, customerOnly, checkEligibilityValidation, checkEligibility);
router.get('/my-applications', authMiddleware, customerOnly, getMyApplications);
router.get('/my-applications/:id', authMiddleware, customerOnly, objectIdValidation, getMyApplicationById);
router.post('/', authMiddleware, customerOnly, submitApplicationValidation, submitApplication);

// Staff routes
router.get('/config', authMiddleware, staffOnly, getApprovalConfig);
router.get('/', authMiddleware, staffOnly, getApplications);
router.get('/:id', authMiddleware, staffOnly, objectIdValidation, getApplicationById);
router.patch('/:id/review', authMiddleware, staffOnly, objectIdValidation, reviewValidation, reviewApplication);

module.exports = router;
