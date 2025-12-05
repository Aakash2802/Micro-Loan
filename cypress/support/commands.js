// cypress/support/commands.js

// Login command
Cypress.Commands.add('login', (email, password) => {
  cy.session([email, password], () => {
    cy.visit('/login');
    cy.get('input[type="email"]').type(email);
    cy.get('input[type="password"]').type(password);
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/dashboard');
  });
});

// Login as admin
Cypress.Commands.add('loginAsAdmin', () => {
  cy.login('admin@loansphere.com', 'Admin@123');
});

// Login as officer
Cypress.Commands.add('loginAsOfficer', () => {
  cy.login('officer@loansphere.com', 'Officer@123');
});

// Login as customer
Cypress.Commands.add('loginAsCustomer', () => {
  cy.login('customer@loansphere.com', 'Customer@123');
});

// Logout command
Cypress.Commands.add('logout', () => {
  cy.window().then((win) => {
    win.localStorage.removeItem('token');
    win.localStorage.removeItem('user');
  });
  cy.visit('/login');
});

// API login (faster, no UI)
Cypress.Commands.add('apiLogin', (email, password) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/auth/login`,
    body: { email, password },
  }).then((response) => {
    window.localStorage.setItem('token', response.body.data.token);
    window.localStorage.setItem('user', JSON.stringify(response.body.data.user));
  });
});

// Check toast message
Cypress.Commands.add('checkToast', (message) => {
  cy.contains(message).should('be.visible');
});

// Wait for loading to complete
Cypress.Commands.add('waitForLoading', () => {
  cy.get('.animate-spin', { timeout: 10000 }).should('not.exist');
});

// Fill form field
Cypress.Commands.add('fillField', (selector, value) => {
  cy.get(selector).clear().type(value);
});

// Select from dropdown
Cypress.Commands.add('selectOption', (selector, value) => {
  cy.get(selector).select(value);
});

// Check table has rows
Cypress.Commands.add('tableHasRows', (minRows = 1) => {
  cy.get('table tbody tr').should('have.length.at.least', minRows);
});

// Navigate to sidebar link
Cypress.Commands.add('navigateTo', (linkText) => {
  cy.contains('a', linkText).click();
});
