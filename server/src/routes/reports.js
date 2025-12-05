// server/src/routes/reports.js
const express = require('express');
const { param, query } = require('express-validator');
const router = express.Router();

const {
  getDashboardStats,
  getLoanPerformance,
  getCollectionReport,
  getOverdueReport,
  downloadLoanStatement,
  downloadEMIReceipt,
  exportEMIHistory,
  getAuditLogs,
} = require('../controllers/reportController');

const { authMiddleware } = require('../middlewares/authMiddleware');
const { staffOnly, adminOnly } = require('../middlewares/roleMiddleware');
const { reportLimiter, downloadLimiter } = require('../middlewares/rateLimit');

// Validation
const objectIdValidation = [
  param('loanAccountId').isMongoId().withMessage('Invalid loan account ID'),
];

const emiIdValidation = [
  param('emiId').isMongoId().withMessage('Invalid EMI ID'),
];

const dateRangeValidation = [
  query('startDate')
    .optional()
    .isISO8601().withMessage('Invalid start date format'),
  query('endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date format'),
];

// Dashboard (staff only)
router.get('/dashboard', authMiddleware, staffOnly, getDashboardStats);

// Analytics (staff only)
router.get('/loan-performance', authMiddleware, staffOnly, dateRangeValidation, getLoanPerformance);
router.get('/collections', authMiddleware, staffOnly, dateRangeValidation, getCollectionReport);
router.get('/overdue', authMiddleware, staffOnly, getOverdueReport);

// PDF downloads (available to customers for their own loans)
router.get(
  '/loan-statement/:loanAccountId',
  authMiddleware,
  downloadLimiter,
  objectIdValidation,
  downloadLoanStatement
);

router.get(
  '/emi-receipt/:emiId',
  authMiddleware,
  downloadLimiter,
  emiIdValidation,
  downloadEMIReceipt
);

// CSV export (available to customers for their own loans)
router.get(
  '/export/emis/:loanAccountId',
  authMiddleware,
  reportLimiter,
  objectIdValidation,
  exportEMIHistory
);

// Audit logs (admin only)
router.get('/audit-logs', authMiddleware, adminOnly, dateRangeValidation, getAuditLogs);

module.exports = router;
