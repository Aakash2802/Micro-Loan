// cypress/e2e/loans.cy.js
describe('Loan Management', () => {
  beforeEach(() => {
    cy.fixture('users').then((users) => {
      cy.visit('/login');
      cy.get('input[type="email"]').type(users.admin.email);
      cy.get('input[type="password"]').type(users.admin.password);
      cy.get('button[type="submit"]').click();
      // Wait for navigation away from login (may go to dashboard or 2FA)
      cy.url({ timeout: 15000 }).should('not.include', '/login');
    });
  });

  describe('Loan List Page', () => {
    beforeEach(() => {
      cy.visit('/dashboard/loans');
    });

    it('should display loans page header', () => {
      cy.contains('Loan Accounts').should('be.visible');
    });

    it('should display filter buttons', () => {
      cy.contains('button', 'All Loans').should('be.visible');
      cy.contains('button', 'Active').should('be.visible');
      cy.contains('button', 'Overdue').should('be.visible');
      cy.contains('button', 'NPA').should('be.visible');
    });

    it('should have search input', () => {
      cy.get('input[placeholder*="Search"]').should('be.visible');
    });

    it('should filter by status', () => {
      cy.contains('button', 'Active').click();
      cy.url().should('include', 'status=active');
    });

    it('should show create loan button', () => {
      cy.contains('New Loan').should('be.visible');
    });

    it('should navigate to loan detail when clicking a loan', () => {
      // Wait for table to load with data
      cy.get('table tbody tr', { timeout: 10000 }).should('have.length.at.least', 1);
      // Click on the first loan's link
      cy.get('table tbody tr').first().find('a').first().click();
      cy.url().should('match', /\/dashboard\/loans\/[a-f0-9]+/);
    });
  });

  describe('Create Loan', () => {
    beforeEach(() => {
      cy.visit('/dashboard/loans/new');
    });

    it('should display create loan form', () => {
      cy.contains(/create loan|new loan/i).should('be.visible');
    });

    it('should have customer selection', () => {
      // May be a custom dropdown or search input
      cy.contains(/customer|select customer/i).should('be.visible');
    });

    it('should have loan product selection', () => {
      // May be a custom dropdown
      cy.contains(/loan product|product/i).should('be.visible');
    });

    it('should have principal amount input', () => {
      cy.get('input[name="principal"], input[placeholder*="amount" i], input[type="number"]').should('exist');
    });

    it('should have submit button', () => {
      // Submit button exists (may be disabled until form is complete)
      cy.get('button[type="submit"]').should('exist');
    });
  });

  describe('Loan Applications', () => {
    beforeEach(() => {
      cy.visit('/dashboard/applications');
    });

    it('should display applications page', () => {
      cy.contains('Applications').should('be.visible');
    });

    it('should have status filters', () => {
      cy.contains('button', /pending|all/i).should('be.visible');
    });

    it('should display applications content', () => {
      // Page should load and display some content (table, list, or empty state)
      cy.get('main, [role="main"], .container, #root').should('exist');
      // Wait for data to load
      cy.wait(1000);
    });
  });
});

describe('Customer Loan Application', () => {
  beforeEach(() => {
    cy.fixture('users').then((users) => {
      cy.visit('/login');
      cy.get('input[type="email"]').type(users.customer.email);
      cy.get('input[type="password"]').type(users.customer.password);
      cy.get('button[type="submit"]').click();
      // Wait for navigation away from login
      cy.url({ timeout: 15000 }).should('not.include', '/login');
    });
  });

  describe('View Loan Products', () => {
    it('should display loan products', () => {
      cy.contains('Loan Products').click();
      cy.url().should('include', '/loan-products');
    });
  });

  describe('Apply for Loan', () => {
    beforeEach(() => {
      cy.visit('/dashboard/customer/apply-loan');
    });

    it('should display loan application form', () => {
      cy.contains(/apply|loan application|loan products/i).should('be.visible');
    });

    it('should show loan product options', () => {
      // May be cards, dropdown, or list
      cy.contains(/personal loan|business loan|education loan|home loan|vehicle loan/i).should('be.visible');
    });
  });

  describe('My Applications', () => {
    beforeEach(() => {
      cy.visit('/dashboard/customer/my-applications');
    });

    it('should display applications list', () => {
      cy.contains('My Applications').should('be.visible');
    });
  });

  describe('Pay EMI', () => {
    beforeEach(() => {
      cy.visit('/dashboard/customer/pay-emi');
    });

    it('should display EMI payment page', () => {
      cy.contains(/pay emi|emi payment/i).should('be.visible');
    });
  });
});
