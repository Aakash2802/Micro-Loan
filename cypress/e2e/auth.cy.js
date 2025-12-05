// cypress/e2e/auth.cy.js
describe('Authentication', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  describe('Login Page', () => {
    it('should display login form', () => {
      // UI shows "Welcome back!" (lowercase b with exclamation)
      cy.get('h2').should('contain.text', 'Welcome back');
      cy.get('input[type="email"]').should('be.visible');
      cy.get('input[type="password"]').should('be.visible');
      cy.get('button[type="submit"]').should('be.visible');
    });

    it('should show error for invalid credentials', () => {
      cy.get('input[type="email"]').type('invalid@test.com');
      cy.get('input[type="password"]').type('WrongPassword@123');
      cy.get('button[type="submit"]').click();

      // Should show error message (API returns error)
      cy.contains(/invalid|incorrect|failed|credentials|not found/i, { timeout: 10000 }).should('be.visible');
    });

    it('should login successfully as admin', () => {
      cy.fixture('users').then((users) => {
        cy.get('input[type="email"]').type(users.admin.email);
        cy.get('input[type="password"]').type(users.admin.password);
        cy.get('button[type="submit"]').click();

        // May redirect to dashboard or show 2FA
        cy.url({ timeout: 15000 }).should('not.include', '/login');
      });
    });

    it('should toggle password visibility', () => {
      cy.get('input[type="password"]').type('testpassword');
      cy.get('input[type="password"]').should('have.attr', 'type', 'password');

      // Click the password visibility toggle button (it's next to the password input)
      cy.get('input[name="password"]').parent().find('button').click();
      // Password field should now be type="text"
      cy.get('input[name="password"]').should('have.attr', 'type', 'text');
    });

    it('should have link to register page', () => {
      cy.contains('Create account').click();
      cy.url().should('include', '/register');
    });
  });

  describe('Registration', () => {
    beforeEach(() => {
      cy.visit('/register');
    });

    it('should display registration form', () => {
      cy.get('h2').should('contain.text', 'Register');
      cy.get('input[name="name"]').should('be.visible');
      cy.get('input[type="email"]').should('be.visible');
      cy.get('input[type="tel"]').should('be.visible');
      cy.get('input[type="password"]').should('have.length.at.least', 1);
    });

    it('should validate password strength', () => {
      // Fill all required fields
      cy.get('input[name="name"]').type('Test User');
      cy.get('input[type="email"]').type('testuser@example.com');
      cy.get('input[name="password"]').type('weak');
      cy.get('input[name="confirmPassword"]').type('weak');
      cy.get('button[type="submit"]').click();

      // Should show password validation error
      cy.contains(/password must|at least 6 characters|uppercase|lowercase/i).should('be.visible');
    });

    it('should validate password match', () => {
      cy.get('input[name="name"]').type('Test User');
      cy.get('input[type="email"]').type('testuser@example.com');
      cy.get('input[name="password"]').type('Test@123');
      cy.get('input[name="confirmPassword"]').type('Test@456');
      cy.get('button[type="submit"]').click();

      cy.contains(/passwords do not match/i).should('be.visible');
    });

    it('should have link to login page', () => {
      cy.contains(/sign in/i).click();
      cy.url().should('include', '/login');
    });
  });

  describe('Logout', () => {
    it('should logout successfully', () => {
      cy.fixture('users').then((users) => {
        cy.visit('/login');
        cy.get('input[type="email"]').type(users.admin.email);
        cy.get('input[type="password"]').type(users.admin.password);
        cy.get('button[type="submit"]').click();

        // Wait for navigation away from login
        cy.url({ timeout: 15000 }).should('not.include', '/login');

        // Click on user profile dropdown to open the menu
        // The dropdown button shows user's name (look for "Admin" text in the header)
        cy.get('header').find('button').last().click({ timeout: 10000 });

        // Now find and click Sign out button in the dropdown
        cy.contains('Sign out', { timeout: 5000 }).click();
        cy.url().should('include', '/login');
      });
    });
  });
});
