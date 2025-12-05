// server/src/utils/index.js
// Central export for all utilities

const emiCalculator = require('./emiCalculator');
const creditScore = require('./creditScore');
const pdfGenerator = require('./pdfGenerator');

module.exports = {
  ...emiCalculator,
  ...creditScore,
  ...pdfGenerator,
};
