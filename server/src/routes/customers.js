// server/src/routes/customers.js
const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

const {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  addKycDocument,
  verifyKycDocument,
  getCustomerCreditScore,
  getMyProfile,
  updateMyProfile,
  deleteCustomer,
} = require('../controllers/customerController');

const {
  getCustomerNotes,
  addCustomerNote,
  updateCustomerNote,
  deleteCustomerNote,
  toggleNotePin,
  completeFollowUp,
  getPendingFollowUps,
  getNoteTypes,
} = require('../controllers/customerNoteController');

const { authMiddleware } = require('../middlewares/authMiddleware');
const { staffOnly, adminOnly, customerOnly, isOwnCustomerData } = require('../middlewares/roleMiddleware');

// Validation rules
const createCustomerValidation = [
  body('fullName')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 150 }).withMessage('Name must be 2-150 characters'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .optional()
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('dob')
    .notEmpty().withMessage('Date of birth is required')
    .isISO8601().withMessage('Invalid date format'),
  body('gender')
    .notEmpty().withMessage('Gender is required')
    .isIn(['male', 'female', 'other']).withMessage('Invalid gender'),
  body('phone')
    .notEmpty().withMessage('Phone is required')
    .matches(/^[6-9]\d{9}$/).withMessage('Invalid phone number'),
  body('address.street')
    .notEmpty().withMessage('Street address is required'),
  body('address.city')
    .notEmpty().withMessage('City is required'),
  body('address.state')
    .notEmpty().withMessage('State is required'),
  body('address.pincode')
    .notEmpty().withMessage('Pincode is required')
    .matches(/^\d{6}$/).withMessage('Invalid pincode'),
  body('employmentType')
    .notEmpty().withMessage('Employment type is required')
    .isIn(['salaried', 'self_employed', 'business', 'retired', 'student', 'unemployed']),
  body('monthlyIncome')
    .notEmpty().withMessage('Monthly income is required')
    .isNumeric().withMessage('Income must be a number')
    .custom((value) => value >= 0).withMessage('Income cannot be negative'),
];

const updateCustomerValidation = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 150 }).withMessage('Name must be 2-150 characters'),
  body('dob')
    .optional()
    .isISO8601().withMessage('Invalid date format'),
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other']).withMessage('Invalid gender'),
  body('phone')
    .optional()
    .matches(/^[6-9]\d{9}$/).withMessage('Invalid phone number'),
  body('monthlyIncome')
    .optional()
    .isNumeric().withMessage('Income must be a number'),
];

const kycDocValidation = [
  body('type')
    .notEmpty().withMessage('Document type is required')
    .isIn(['aadhaar', 'pan', 'voter_id', 'passport', 'driving_license', 'bank_statement', 'salary_slip', 'other']),
  body('url')
    .notEmpty().withMessage('Document URL is required')
    .isURL().withMessage('Invalid URL'),
  body('documentNumber')
    .optional()
    .trim(),
];

const objectIdValidation = [
  param('id').isMongoId().withMessage('Invalid ID format'),
];

// Customer self-service routes (must be before /:id routes)
router.get('/my-profile', authMiddleware, customerOnly, getMyProfile);
router.put('/my-profile', authMiddleware, customerOnly, updateMyProfile);

// Staff routes
router.get('/', authMiddleware, staffOnly, getCustomers);
router.post('/', authMiddleware, staffOnly, createCustomerValidation, createCustomer);

router.get('/:id', authMiddleware, objectIdValidation, isOwnCustomerData, getCustomerById);
router.put('/:id', authMiddleware, staffOnly, objectIdValidation, updateCustomerValidation, updateCustomer);
router.delete('/:id', authMiddleware, adminOnly, objectIdValidation, deleteCustomer);

// KYC routes
router.post('/:id/kyc', authMiddleware, staffOnly, objectIdValidation, kycDocValidation, addKycDocument);
router.patch('/:id/kyc/:docId/verify', authMiddleware, staffOnly, verifyKycDocument);

// Credit score
router.get('/:id/credit-score', authMiddleware, objectIdValidation, isOwnCustomerData, getCustomerCreditScore);

// Customer notes routes (staff only)
router.get('/notes/follow-ups', authMiddleware, staffOnly, getPendingFollowUps);
router.get('/notes/types', authMiddleware, staffOnly, getNoteTypes);
router.get('/:id/notes', authMiddleware, staffOnly, objectIdValidation, getCustomerNotes);
router.post('/:id/notes', authMiddleware, staffOnly, objectIdValidation, addCustomerNote);
router.put('/:id/notes/:noteId', authMiddleware, staffOnly, updateCustomerNote);
router.delete('/:id/notes/:noteId', authMiddleware, staffOnly, deleteCustomerNote);
router.patch('/:id/notes/:noteId/pin', authMiddleware, staffOnly, toggleNotePin);
router.patch('/:id/notes/:noteId/complete-followup', authMiddleware, staffOnly, completeFollowUp);

module.exports = router;
