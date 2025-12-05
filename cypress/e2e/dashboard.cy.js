// cypress/e2e/dashboard.cy.js
describe('Admin Dashboard', () => {
  beforeEach(() => {
    cy.fixture('users').then((users) => {
      cy.visit('/login');
      cy.get('input[type="email"]').type(users.admin.email);
      cy.get('input[type="password"]').type(users.admin.password);
      cy.get('button[type="submit"]').click();
      cy.url().should('include', '/dashboard');
    });
  });

  describe('Dashboard Overview', () => {
    it('should display dashboard title', () => {
      cy.contains('Dashboard').should('be.visible');
    });

    it('should display stat cards', () => {
      cy.contains('Total Disbursed').should('be.visible');
      cy.contains('Amount Collected').should('be.visible');
      cy.contains('Outstanding').should('be.visible');
      cy.contains('Overdue').should('be.visible');
    });

    it('should display collection trend chart', () => {
      cy.contains('Collection Trend').should('be.visible');
    });

    it('should display loan status chart', () => {
      cy.contains('Loan Status').should('be.visible');
    });

    it('should display quick stats section', () => {
      cy.contains('Quick Stats').should('be.visible');
      cy.contains('Total Customers').should('be.visible');
    });

    it('should display recent loans table', () => {
      cy.contains('Recent Loans').should('be.visible');
    });
  });

  describe('Stat Card Navigation', () => {
    it('should navigate to loans page when clicking Total Disbursed', () => {
      cy.contains('Total Disbursed').closest('div[class*="cursor-pointer"]').click();
      cy.url().should('include', '/dashboard/loans');
    });

    it('should navigate to active loans when clicking Outstanding', () => {
      cy.contains('Outstanding').closest('div[class*="cursor-pointer"]').click();
      cy.url().should('include', '/dashboard/loans');
      cy.url().should('include', 'status=active');
    });

    it('should navigate to overdue loans when clicking Overdue', () => {
      cy.contains('Overdue').closest('div[class*="cursor-pointer"]').click();
      cy.url().should('include', '/dashboard/loans');
      cy.url().should('include', 'status=overdue');
    });
  });

  describe('Chart Toggle', () => {
    it('should switch between monthly and weekly view', () => {
      // Default should be monthly
      cy.contains('Monthly collection performance').should('be.visible');

      // Click weekly button
      cy.contains('button', 'Weekly').click();
      cy.contains('Weekly collection performance').should('be.visible');

      // Click monthly button
      cy.contains('button', 'Monthly').click();
      cy.contains('Monthly collection performance').should('be.visible');
    });
  });

  describe('Navigation', () => {
    it('should navigate to customers page', () => {
      cy.contains('a', 'Customers').click();
      cy.url().should('include', '/dashboard/customers');
    });

    it('should navigate to loan products page', () => {
      cy.contains('a', 'Loan Products').click();
      cy.url().should('include', '/dashboard/loan-products');
    });

    it('should navigate to applications page', () => {
      cy.contains('a', 'Applications').click();
      cy.url().should('include', '/dashboard/applications');
    });

    it('should navigate to loans page', () => {
      cy.contains('a', 'Loans').click();
      cy.url().should('include', '/dashboard/loans');
    });
  });

  describe('Create Loan Button', () => {
    it('should navigate to create loan page', () => {
      cy.contains('New Loan').click();
      cy.url().should('include', '/dashboard/loans/new');
    });
  });
});

describe('Customer Dashboard', () => {
  beforeEach(() => {
    cy.fixture('users').then((users) => {
      cy.visit('/login');
      cy.get('input[type="email"]').type(users.customer.email);
      cy.get('input[type="password"]').type(users.customer.password);
      cy.get('button[type="submit"]').click();
      cy.url().should('include', '/dashboard/customer');
    });
  });

  it('should display customer dashboard', () => {
    cy.contains(/dashboard|my dashboard/i).should('be.visible');
  });

  it('should show loan products link', () => {
    cy.contains('Loan Products').should('be.visible');
  });

  it('should show apply for loan link', () => {
    cy.contains(/apply|apply for loan/i).should('be.visible');
  });

  it('should show my applications link', () => {
    cy.contains('My Applications').should('be.visible');
  });

  it('should show pay EMI link', () => {
    cy.contains('Pay EMI').should('be.visible');
  });
});
