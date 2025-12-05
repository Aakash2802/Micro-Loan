// server/src/routes/index.js
const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const customerRoutes = require('./customers');
const loanProductRoutes = require('./loanProducts');
const loanAccountRoutes = require('./loanAccounts');
const loanApplicationRoutes = require('./loanApplications');
const paymentRoutes = require('./payments');
const onlinePaymentRoutes = require('./onlinePayments');
const reportRoutes = require('./reports');
const documentRoutes = require('./documents');
const mandateRoutes = require('./mandates');

// API Routes
router.use('/auth', authRoutes);
router.use('/customers', customerRoutes);
router.use('/loan-products', loanProductRoutes);
router.use('/loan-accounts', loanAccountRoutes);
router.use('/loan-applications', loanApplicationRoutes);
router.use('/payments', paymentRoutes);
router.use('/online-payments', onlinePaymentRoutes);
router.use('/reports', reportRoutes);
router.use('/documents', documentRoutes);
router.use('/mandates', mandateRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'LoanSphere API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

module.exports = router;
