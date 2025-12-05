// server/src/controllers/index.js
// Central export for all controllers

const authController = require('./authController');
const customerController = require('./customerController');
const loanProductController = require('./loanProductController');
const loanAccountController = require('./loanAccountController');
const loanApplicationController = require('./loanApplicationController');
const paymentController = require('./paymentController');
const reportController = require('./reportController');

module.exports = {
  authController,
  customerController,
  loanProductController,
  loanAccountController,
  loanApplicationController,
  paymentController,
  reportController,
};
