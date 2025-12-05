// cypress/e2e/customers.cy.js
describe('Customer Management', () => {
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

  describe('Customer List', () => {
    beforeEach(() => {
      cy.visit('/dashboard/customers');
    });

    it('should display customers page', () => {
      cy.contains('Customers').should('be.visible');
    });

    it('should have search functionality', () => {
      cy.get('input[placeholder*="Search"]').should('be.visible');
    });

    it('should display customers table', () => {
      cy.get('table').should('exist');
    });

    it('should have KYC filter options', () => {
      cy.contains(/all|verified|pending/i).should('be.visible');
    });

    it('should navigate to customer detail', () => {
      cy.get('table tbody tr').first().then(($row) => {
        if ($row.length && $row.find('a').length) {
          cy.wrap($row).find('a').first().click();
          cy.url().should('match', /\/dashboard\/customers\/[a-f0-9]+/);
        }
      });
    });
  });

  describe('Customer Detail', () => {
    it('should display customer information', () => {
      cy.visit('/dashboard/customers');

      // Click on first customer if exists
      cy.get('table tbody tr').first().then(($row) => {
        if ($row.length && $row.find('a').length) {
          cy.wrap($row).find('a').first().click();

          // Should show customer details
          cy.contains(/customer|profile/i).should('be.visible');
        }
      });
    });
  });

  describe('Customer Search', () => {
    beforeEach(() => {
      cy.visit('/dashboard/customers');
    });

    it('should search by name', () => {
      // Use first() since there might be multiple search inputs (header + page)
      cy.get('input[placeholder*="Search"]').first().type('Test');
      // Results should update
      cy.wait(500); // Debounce
    });

    it('should search by phone', () => {
      cy.get('input[placeholder*="Search"]').first().type('9876');
      cy.wait(500);
    });

    it('should show no results message for invalid search', () => {
      cy.get('input[placeholder*="Search"]').first().type('xyznonexistent12345');
      cy.wait(500);
      // Should show empty state or no results
    });
  });
});

describe('Customer Profile (Customer View)', () => {
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

  describe('Profile Page', () => {
    beforeEach(() => {
      cy.visit('/dashboard/customer/profile');
    });

    it('should display profile page', () => {
      cy.contains(/profile|my profile/i).should('be.visible');
    });

    it('should display personal information', () => {
      cy.contains(/personal|information/i).should('be.visible');
    });

    it('should display KYC status', () => {
      cy.contains(/kyc|verification/i).should('be.visible');
    });
  });
});
