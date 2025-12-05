// server/src/models/index.js
// Central export for all models

const User = require('./User');
const Customer = require('./Customer');
const LoanProduct = require('./LoanProduct');
const LoanAccount = require('./LoanAccount');
const LoanApplication = require('./LoanApplication');
const EMI = require('./EMI');
const AuditLog = require('./AuditLog');

module.exports = {
  User,
  Customer,
  LoanProduct,
  LoanAccount,
  LoanApplication,
  EMI,
  AuditLog,
};
