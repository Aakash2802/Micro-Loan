// server/src/__tests__/helpers.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Customer = require('../models/Customer');
const LoanProduct = require('../models/LoanProduct');

/**
 * Create a test user and return user + token
 */
const createTestUser = async (overrides = {}) => {
  const hashedPassword = await bcrypt.hash('Test@123', 10);

  const userData = {
    name: 'Test User',
    email: `test${Date.now()}@example.com`,
    password: hashedPassword,
    role: 'admin',
    isActive: true,
    ...overrides,
  };

  const user = await User.create(userData);

  const token = jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  return { user, token };
};

/**
 * Create a test customer
 */
const createTestCustomer = async (userId, overrides = {}) => {
  const customerData = {
    userId,
    fullName: 'Test Customer',
    phone: `98765${Date.now().toString().slice(-5)}`,
    email: `customer${Date.now()}@example.com`,
    address: {
      street: '123 Test Street',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456',
    },
    kycStatus: 'verified',
    ...overrides,
  };

  return Customer.create(customerData);
};

/**
 * Create a test loan product
 */
const createTestLoanProduct = async (overrides = {}) => {
  const productData = {
    name: 'Test Personal Loan',
    code: `TPL${Date.now()}`,
    description: 'Test loan product',
    interestRate: 12,
    minAmount: 10000,
    maxAmount: 500000,
    minTenure: 3,
    maxTenure: 36,
    processingFee: 2,
    penaltyRate: 2,
    isActive: true,
    ...overrides,
  };

  return LoanProduct.create(productData);
};

/**
 * Generate auth header
 */
const authHeader = (token) => ({
  Authorization: `Bearer ${token}`,
});

module.exports = {
  createTestUser,
  createTestCustomer,
  createTestLoanProduct,
  authHeader,
};
