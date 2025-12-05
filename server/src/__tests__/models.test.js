// server/src/__tests__/models.test.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Customer = require('../models/Customer');
const LoanProduct = require('../models/LoanProduct');
const LoanAccount = require('../models/LoanAccount');
const EMI = require('../models/EMI');

describe('User Model', () => {
  it('should create a user with valid data', async () => {
    const userData = {
      name: 'Test User',
      email: 'testuser@example.com',
      passwordHash: 'Test@123', // Pre-save hook will hash this
      role: 'admin',
    };

    const user = await User.create(userData);

    expect(user.name).toBe('Test User');
    expect(user.email).toBe('testuser@example.com');
    expect(user.role).toBe('admin');
    expect(user.isActive).toBe(true);
  });

  it('should reject invalid email', async () => {
    const userData = {
      name: 'Test User',
      email: 'invalid-email',
      passwordHash: 'Test@123',
      role: 'admin',
    };

    await expect(User.create(userData)).rejects.toThrow();
  });

  it('should reject invalid role', async () => {
    const userData = {
      name: 'Test User',
      email: 'valid@example.com',
      passwordHash: 'Test@123',
      role: 'invalid_role',
    };

    await expect(User.create(userData)).rejects.toThrow();
  });
});

describe('Customer Model', () => {
  let testUser;

  beforeEach(async () => {
    testUser = await User.create({
      name: 'Customer User',
      email: 'customermodel@example.com',
      passwordHash: 'Test@123', // Pre-save hook will hash this
      role: 'customer',
    });
  });

  it('should create a customer with valid data', async () => {
    const customerData = {
      userId: testUser._id,
      fullName: 'John Doe',
      phone: '9876543210',
      email: 'johndoe@example.com',
      dob: new Date('1990-05-15'),
      gender: 'male',
      employmentType: 'salaried',
      monthlyIncome: 50000,
      address: {
        street: '123 Main St',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
    };

    const customer = await Customer.create(customerData);

    expect(customer.fullName).toBe('John Doe');
    expect(customer.phone).toBe('9876543210');
    expect(customer.kycStatus).toBe('pending');
  });

  it('should validate phone number format', async () => {
    const customerData = {
      userId: testUser._id,
      fullName: 'Invalid Phone',
      phone: '123', // Invalid phone
      email: 'invalid@example.com',
      dob: new Date('1990-05-15'),
      gender: 'male',
      employmentType: 'salaried',
      monthlyIncome: 50000,
      address: {
        street: '123 Main St',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
    };

    await expect(Customer.create(customerData)).rejects.toThrow();
  });
});

describe('LoanProduct Model', () => {
  it('should create a loan product with valid data', async () => {
    const productData = {
      name: 'Personal Loan',
      code: 'PL',
      description: 'Personal loan for various needs',
      interestRate: 12,
      minAmount: 10000,
      maxAmount: 500000,
      minTenureMonths: 3,
      maxTenureMonths: 36,
      processingFee: 2,
      latePenaltyRate: 2,
    };

    const product = await LoanProduct.create(productData);

    expect(product.name).toBe('Personal Loan');
    expect(product.interestRate).toBe(12);
    expect(product.isActive).toBe(true);
  });

  it('should reject negative interest rate', async () => {
    const productData = {
      name: 'Invalid Product',
      code: 'INV',
      interestRate: -5,
      minAmount: 10000,
      maxAmount: 500000,
      minTenureMonths: 3,
      maxTenureMonths: 36,
    };

    await expect(LoanProduct.create(productData)).rejects.toThrow();
  });

  it('should reject minAmount greater than maxAmount', async () => {
    const productData = {
      name: 'Invalid Product Two',
      code: 'INVTWO',
      interestRate: 12,
      minAmount: 500000,
      maxAmount: 10000, // Less than minAmount
      minTenureMonths: 3,
      maxTenureMonths: 36,
    };

    // This should be caught by the custom validator
    await expect(LoanProduct.create(productData)).rejects.toThrow();
  });
});

describe('EMI Model', () => {
  it('should have correct status enum values', () => {
    const schema = EMI.schema;
    const statusPath = schema.path('status');
    const enumValues = statusPath.enumValues;

    expect(enumValues).toContain('pending');
    expect(enumValues).toContain('paid');
    expect(enumValues).toContain('overdue');
    expect(enumValues).toContain('partial');
    expect(enumValues).toContain('waived');
  });
});
