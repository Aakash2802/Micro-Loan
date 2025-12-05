// server/src/routes/loanProducts.js
const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

const {
  getLoanProducts,
  getLoanProductById,
  createLoanProduct,
  updateLoanProduct,
  toggleProductActive,
  toggleProductPublish,
  deleteLoanProduct,
  calculateEMIPreview,
  getCategories,
} = require('../controllers/loanProductController');

const { authMiddleware } = require('../middlewares/authMiddleware');
const { adminOnly } = require('../middlewares/roleMiddleware');

// Validation rules
const createProductValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Product name is required')
    .isLength({ min: 3, max: 100 }).withMessage('Name must be 3-100 characters'),
  body('code')
    .trim()
    .notEmpty().withMessage('Product code is required')
    .matches(/^[A-Za-z]{2,10}$/).withMessage('Code must be 2-10 letters'),
  body('interestRate')
    .notEmpty().withMessage('Interest rate is required')
    .isFloat({ min: 0, max: 50 }).withMessage('Interest rate must be 0-50%'),
  body('minTenureMonths')
    .notEmpty().withMessage('Minimum tenure is required')
    .isInt({ min: 1 }).withMessage('Minimum tenure must be at least 1 month'),
  body('maxTenureMonths')
    .notEmpty().withMessage('Maximum tenure is required')
    .isInt({ min: 1 }).withMessage('Maximum tenure must be at least 1 month'),
  body('minAmount')
    .notEmpty().withMessage('Minimum amount is required')
    .isFloat({ min: 1000 }).withMessage('Minimum amount must be at least ₹1,000'),
  body('maxAmount')
    .notEmpty().withMessage('Maximum amount is required')
    .isFloat({ min: 1000 }).withMessage('Maximum amount must be at least ₹1,000'),
  body('processingFee')
    .optional()
    .isFloat({ min: 0 }).withMessage('Processing fee cannot be negative'),
  body('category')
    .optional()
    .isIn(['personal', 'business', 'education', 'vehicle', 'home', 'gold', 'agriculture', 'other']),
  body('interestType')
    .optional()
    .isIn(['reducing', 'flat']).withMessage('Interest type must be reducing or flat'),
];

const updateProductValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage('Name must be 3-100 characters'),
  body('interestRate')
    .optional()
    .isFloat({ min: 0, max: 50 }).withMessage('Interest rate must be 0-50%'),
  body('minTenureMonths')
    .optional()
    .isInt({ min: 1 }).withMessage('Minimum tenure must be at least 1 month'),
  body('maxTenureMonths')
    .optional()
    .isInt({ min: 1 }).withMessage('Maximum tenure must be at least 1 month'),
  body('minAmount')
    .optional()
    .isFloat({ min: 1000 }).withMessage('Minimum amount must be at least ₹1,000'),
  body('maxAmount')
    .optional()
    .isFloat({ min: 1000 }).withMessage('Maximum amount must be at least ₹1,000'),
];

const emiPreviewValidation = [
  body('principal')
    .notEmpty().withMessage('Principal amount is required')
    .isFloat({ min: 1000 }).withMessage('Principal must be at least ₹1,000'),
  body('tenureMonths')
    .notEmpty().withMessage('Tenure is required')
    .isInt({ min: 1 }).withMessage('Tenure must be at least 1 month'),
];

const objectIdValidation = [
  param('id').isMongoId().withMessage('Invalid ID format'),
];

// Public routes (for viewing products)
router.get('/categories', authMiddleware, getCategories);
router.get('/', authMiddleware, getLoanProducts);
router.get('/:id', authMiddleware, objectIdValidation, getLoanProductById);
router.post('/:id/calculate-emi', authMiddleware, objectIdValidation, emiPreviewValidation, calculateEMIPreview);

// Admin only routes
router.post('/', authMiddleware, adminOnly, createProductValidation, createLoanProduct);
router.put('/:id', authMiddleware, adminOnly, objectIdValidation, updateProductValidation, updateLoanProduct);
router.patch('/:id/toggle-active', authMiddleware, adminOnly, objectIdValidation, toggleProductActive);
router.patch('/:id/toggle-publish', authMiddleware, adminOnly, objectIdValidation, toggleProductPublish);
router.delete('/:id', authMiddleware, adminOnly, objectIdValidation, deleteLoanProduct);

module.exports = router;
