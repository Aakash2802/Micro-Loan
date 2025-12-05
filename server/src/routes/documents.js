// server/src/routes/documents.js
const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

const {
  uploadKYCDocument,
  getMyKYCDocuments,
  deleteKYCDocument,
  uploadProfilePhoto,
  verifyKYCDocument,
  getCustomerKYCDocuments,
} = require('../controllers/documentController');

const { authMiddleware } = require('../middlewares/authMiddleware');
const { staffOnly, customerOnly } = require('../middlewares/roleMiddleware');
const { uploadLimiter } = require('../middlewares/rateLimit');

// Validation rules
const uploadKYCValidation = [
  body('type')
    .notEmpty().withMessage('Document type is required')
    .isIn(['aadhaar', 'pan', 'voter_id', 'passport', 'driving_license', 'bank_statement', 'salary_slip', 'other'])
    .withMessage('Invalid document type'),
  body('documentNumber')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Document number too long'),
  body('file')
    .notEmpty().withMessage('File is required'),
];

const verifyKYCValidation = [
  param('customerId').isMongoId().withMessage('Invalid customer ID'),
  param('docId').isMongoId().withMessage('Invalid document ID'),
  body('verified').isBoolean().withMessage('Verified must be boolean'),
  body('remarks').optional().trim(),
];

// Customer routes
router.post('/kyc', authMiddleware, customerOnly, uploadLimiter, uploadKYCValidation, uploadKYCDocument);
router.get('/kyc', authMiddleware, customerOnly, getMyKYCDocuments);
router.delete('/kyc/:docId', authMiddleware, customerOnly, deleteKYCDocument);
router.post('/profile-photo', authMiddleware, customerOnly, uploadLimiter, uploadProfilePhoto);

// Staff routes
router.get('/kyc/:customerId', authMiddleware, staffOnly, getCustomerKYCDocuments);
router.patch('/kyc/:customerId/:docId/verify', authMiddleware, staffOnly, verifyKYCValidation, verifyKYCDocument);

module.exports = router;
