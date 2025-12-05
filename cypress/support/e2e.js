// cypress/support/e2e.js
// Import commands.js
import './commands';

// Prevent uncaught exceptions from failing tests
Cypress.on('uncaught:exception', (err, runnable) => {
  // Return false to prevent the error from failing the test
  return false;
});

// Log all XHR/fetch requests (for debugging)
// Cypress.on('log:added', (attrs, log) => {
//   if (attrs.name === 'xhr' || attrs.name === 'fetch') {
//     console.log(attrs);
//   }
// });
