// server/src/utils/seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const User = require('../models/User');
const Customer = require('../models/Customer');
const LoanProduct = require('../models/LoanProduct');
const LoanAccount = require('../models/LoanAccount');
const EMI = require('../models/EMI');
const { generateAmortizationSchedule } = require('./emiCalculator');

/**
 * Seed Script
 * Populates the database with sample data for development/testing
 *
 * Run with: npm run seed
 */

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/loansphere';

// Sample data
const usersData = [
  {
    name: 'Aakash',
    email: 'aakash@gmail.com',
    password: 'Aakash1234',
    role: 'admin',
  },
  {
    name: 'Loan Officer',
    email: 'officer@loansphere.com',
    password: 'Officer@123',
    role: 'officer',
  },
  {
    name: 'Test Customer',
    email: 'customer@loansphere.com',
    password: 'Customer@123',
    role: 'customer',
  },
  {
    name: 'Rajesh Kumar',
    email: 'rajesh@example.com',
    password: 'Customer@123',
    role: 'customer',
  },
  {
    name: 'Priya Sharma',
    email: 'priya@example.com',
    password: 'Customer@123',
    role: 'customer',
  },
  {
    name: 'Mohammed Ali',
    email: 'ali@example.com',
    password: 'Customer@123',
    role: 'customer',
  },
];

const loanProductsData = [
  {
    name: 'Personal Loan',
    description: 'Quick personal loan for your immediate needs',
    code: 'PL',
    category: 'personal',
    interestRate: 12,
    interestType: 'reducing',
    minTenureMonths: 6,
    maxTenureMonths: 60,
    minAmount: 10000,
    maxAmount: 500000,
    processingFee: 1,
    processingFeeType: 'percentage',
    latePenaltyRate: 2,
    latePenaltyType: 'percentage',
    gracePeriodDays: 3,
    isActive: true,
    isPublished: true,
  },
  {
    name: 'Business Loan',
    description: 'Grow your business with our flexible business loans',
    code: 'BL',
    category: 'business',
    interestRate: 14,
    interestType: 'reducing',
    minTenureMonths: 12,
    maxTenureMonths: 84,
    minAmount: 50000,
    maxAmount: 2000000,
    processingFee: 1.5,
    processingFeeType: 'percentage',
    latePenaltyRate: 2.5,
    latePenaltyType: 'percentage',
    gracePeriodDays: 5,
    isActive: true,
    isPublished: true,
  },
  {
    name: 'Education Loan',
    description: 'Invest in your future with our education loans',
    code: 'EL',
    category: 'education',
    interestRate: 9,
    interestType: 'reducing',
    minTenureMonths: 12,
    maxTenureMonths: 120,
    minAmount: 25000,
    maxAmount: 1500000,
    processingFee: 0.5,
    processingFeeType: 'percentage',
    latePenaltyRate: 1,
    latePenaltyType: 'percentage',
    gracePeriodDays: 7,
    isActive: true,
    isPublished: true,
  },
  {
    name: 'Home Loan',
    description: 'Make your dream home a reality with our affordable home loans',
    code: 'HL',
    category: 'home',
    interestRate: 8.5,
    interestType: 'reducing',
    minTenureMonths: 24,
    maxTenureMonths: 240,
    minAmount: 500000,
    maxAmount: 10000000,
    processingFee: 0.5,
    processingFeeType: 'percentage',
    latePenaltyRate: 1.5,
    latePenaltyType: 'percentage',
    gracePeriodDays: 7,
    isActive: true,
    isPublished: true,
  },
  {
    name: 'Vehicle Loan',
    description: 'Drive your dream car or bike with our vehicle finance options',
    code: 'VL',
    category: 'vehicle',
    interestRate: 10.5,
    interestType: 'reducing',
    minTenureMonths: 12,
    maxTenureMonths: 84,
    minAmount: 50000,
    maxAmount: 3000000,
    processingFee: 1,
    processingFeeType: 'percentage',
    latePenaltyRate: 2,
    latePenaltyType: 'percentage',
    gracePeriodDays: 5,
    isActive: true,
    isPublished: true,
  },
];

const customersData = [
  {
    fullName: 'Test Customer',
    dob: new Date('1992-08-20'),
    gender: 'male',
    phone: '9876543000',
    email: 'customer@loansphere.com',
    address: {
      street: '100 Test Street',
      city: 'Test City',
      state: 'Test State',
      pincode: '100001',
    },
    employmentType: 'salaried',
    employerName: 'Test Company Pvt Ltd',
    monthlyIncome: 50000,
    kycStatus: 'verified',
    kycDocs: [
      { type: 'aadhaar', documentNumber: '0000-0000-0001', url: '/docs/aadhaar-test.pdf', verified: true },
      { type: 'pan', documentNumber: 'TESTP0001A', url: '/docs/pan-test.pdf', verified: true },
    ],
  },
  {
    fullName: 'Rajesh Kumar',
    dob: new Date('1990-05-15'),
    gender: 'male',
    phone: '9876543210',
    email: 'rajesh@example.com',
    address: {
      street: '123 MG Road',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
    },
    employmentType: 'salaried',
    employerName: 'Tech Solutions Pvt Ltd',
    monthlyIncome: 75000,
    kycStatus: 'verified',
    kycDocs: [
      { type: 'aadhaar', documentNumber: '1234-5678-9012', url: '/docs/aadhaar-rajesh.pdf', verified: true },
      { type: 'pan', documentNumber: 'ABCDE1234F', url: '/docs/pan-rajesh.pdf', verified: true },
    ],
  },
  {
    fullName: 'Priya Sharma',
    dob: new Date('1988-11-20'),
    gender: 'female',
    phone: '9876543211',
    email: 'priya@example.com',
    address: {
      street: '456 Park Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
    },
    employmentType: 'self_employed',
    employerName: 'Self - Boutique Owner',
    monthlyIncome: 60000,
    kycStatus: 'verified',
    kycDocs: [
      { type: 'aadhaar', documentNumber: '2345-6789-0123', url: '/docs/aadhaar-priya.pdf', verified: true },
      { type: 'pan', documentNumber: 'FGHIJ5678K', url: '/docs/pan-priya.pdf', verified: true },
    ],
  },
  {
    fullName: 'Mohammed Ali',
    dob: new Date('1985-03-10'),
    gender: 'male',
    phone: '9876543212',
    email: 'ali@example.com',
    address: {
      street: '789 Civil Lines',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600001',
    },
    employmentType: 'business',
    employerName: 'Ali Traders',
    monthlyIncome: 120000,
    kycStatus: 'verified',
    kycDocs: [
      { type: 'aadhaar', documentNumber: '3456-7890-1234', url: '/docs/aadhaar-ali.pdf', verified: true },
      { type: 'pan', documentNumber: 'KLMNO9012P', url: '/docs/pan-ali.pdf', verified: true },
    ],
  },
];

/**
 * Clear existing data
 */
const clearData = async () => {
  console.log('🗑️  Clearing existing data...');
  await EMI.deleteMany({});
  await LoanAccount.deleteMany({});
  await Customer.deleteMany({});
  await LoanProduct.deleteMany({});
  await User.deleteMany({});
  console.log('✅ Data cleared');
};

/**
 * Seed users
 */
const seedUsers = async () => {
  console.log('👤 Seeding users...');
  const users = [];

  for (const userData of usersData) {
    const user = new User({
      name: userData.name,
      email: userData.email,
      passwordHash: userData.password, // Will be hashed by pre-save hook
      role: userData.role,
      isActive: true,
    });
    await user.save();
    users.push(user);
    console.log(`   ✓ Created user: ${user.email} (${user.role})`);
  }

  return users;
};

/**
 * Seed loan products
 */
const seedLoanProducts = async (adminUser) => {
  console.log('📦 Seeding loan products...');
  const products = [];

  for (const productData of loanProductsData) {
    const product = new LoanProduct({
      ...productData,
      createdBy: adminUser._id,
    });
    await product.save();
    products.push(product);
    console.log(`   ✓ Created product: ${product.name} (${product.code})`);
  }

  return products;
};

/**
 * Seed customers
 */
const seedCustomers = async (users, adminUser) => {
  console.log('👥 Seeding customers...');
  const customers = [];

  // Get customer users (last 3 users)
  const customerUsers = users.filter((u) => u.role === 'customer');

  for (let i = 0; i < customersData.length; i++) {
    const customerData = customersData[i];
    const userId = customerUsers[i]._id;

    const customer = new Customer({
      ...customerData,
      userId,
      createdBy: adminUser._id,
    });
    await customer.save();
    customers.push(customer);
    console.log(`   ✓ Created customer: ${customer.fullName}`);
  }

  return customers;
};

/**
 * Seed loan accounts with EMIs
 */
const seedLoanAccounts = async (customers, products, adminUser) => {
  console.log('💰 Seeding loan accounts...');
  const loanAccounts = [];

  // Loan 1: Rajesh - Personal Loan (Active with some paid EMIs)
  const loan1 = await createLoanAccount({
    customer: customers[0],
    product: products[0], // Personal Loan
    principal: 100000,
    tenureMonths: 12,
    startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 6 months ago
    adminUser,
    paidEmis: 5, // 5 EMIs paid
    hasOverdue: false,
  });
  loanAccounts.push(loan1);

  // Loan 2: Priya - Business Loan (Active with overdue EMI)
  const loan2 = await createLoanAccount({
    customer: customers[1],
    product: products[1], // Business Loan
    principal: 200000,
    tenureMonths: 24,
    startDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), // 4 months ago
    adminUser,
    paidEmis: 2, // 2 EMIs paid
    hasOverdue: true, // Has overdue
  });
  loanAccounts.push(loan2);

  // Loan 3: Mohammed - Education Loan (New, just disbursed)
  const loan3 = await createLoanAccount({
    customer: customers[2],
    product: products[2], // Education Loan
    principal: 300000,
    tenureMonths: 36,
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 1 month ago
    adminUser,
    paidEmis: 0, // No EMIs paid yet
    hasOverdue: false,
  });
  loanAccounts.push(loan3);

  // Loan 4: Rajesh - Vehicle Loan (Active)
  const loan4 = await createLoanAccount({
    customer: customers[1],
    product: products[4], // Vehicle Loan
    principal: 150000,
    tenureMonths: 24,
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 3 months ago
    adminUser,
    paidEmis: 3, // 3 EMIs paid
    hasOverdue: false,
  });
  loanAccounts.push(loan4);

  // Loan 5: Rajesh - Home Loan (Active)
  const loan5 = await createLoanAccount({
    customer: customers[1],
    product: products[3], // Home Loan
    principal: 500000,
    tenureMonths: 60,
    startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 2 months ago
    adminUser,
    paidEmis: 2, // 2 EMIs paid
    hasOverdue: false,
  });
  loanAccounts.push(loan5);

  // Loan 6: Mohammed - Personal Loan (Closed)
  const loan6 = await createLoanAccount({
    customer: customers[3],
    product: products[0], // Personal Loan
    principal: 50000,
    tenureMonths: 6,
    startDate: new Date(Date.now() - 210 * 24 * 60 * 60 * 1000), // 7 months ago
    adminUser,
    paidEmis: 6, // All EMIs paid
    hasOverdue: false,
  });
  loanAccounts.push(loan6);

  return loanAccounts;
};

/**
 * Create a loan account with EMIs
 */
const createLoanAccount = async ({ customer, product, principal, tenureMonths, startDate, adminUser, paidEmis, hasOverdue }) => {
  // Generate amortization schedule
  const { summary, schedule } = generateAmortizationSchedule(
    principal,
    product.interestRate,
    tenureMonths,
    startDate,
    product.interestType
  );

  // Calculate processing fee
  const processingFee = product.calculateProcessingFee(principal);

  // Generate account number
  const accountNumber = await LoanAccount.generateAccountNumber();

  // Create loan account
  const loanAccount = new LoanAccount({
    accountNumber,
    customerId: customer._id,
    productId: product._id,
    principal,
    interestRate: product.interestRate,
    interestType: product.interestType,
    tenureMonths,
    emiAmount: summary.emiAmount,
    totalEMIs: tenureMonths,
    startDate,
    firstEmiDate: schedule[0].dueDate,
    totalInterest: summary.totalInterest,
    totalPayable: summary.totalPayable,
    processingFee,
    disbursedAmount: principal - processingFee,
    status: 'active',
    disbursement: {
      amount: principal - processingFee,
      date: startDate,
      mode: 'bank_transfer',
      referenceNumber: `DIS-${Date.now()}`,
      disbursedBy: adminUser._id,
    },
    approvedBy: adminUser._id,
    approvalDate: new Date(startDate.getTime() - 24 * 60 * 60 * 1000),
    createdBy: adminUser._id,
  });

  await loanAccount.save();

  // Create EMIs
  for (const emiData of schedule) {
    const emi = new EMI({
      loanAccountId: loanAccount._id,
      sequence: emiData.sequence,
      dueDate: emiData.dueDate,
      amount: emiData.amount,
      principalComponent: emiData.principalComponent,
      interestComponent: emiData.interestComponent,
      openingBalance: emiData.openingBalance,
      closingBalance: emiData.closingBalance,
      status: 'pending',
    });

    // Mark EMIs as paid based on paidEmis count
    if (emiData.sequence <= paidEmis) {
      const paidDate = new Date(emiData.dueDate);
      // Simulate some late payments
      if (emiData.sequence === paidEmis && hasOverdue === false && paidEmis > 2) {
        paidDate.setDate(paidDate.getDate() + 5); // 5 days late
        emi.daysLate = 5;
        emi.penaltyAmount = (emi.amount * product.latePenaltyRate) / 100;
      }

      emi.status = 'paid';
      emi.paidDate = paidDate;
      emi.paidAmount = emi.amount + (emi.penaltyAmount || 0);
      emi.paymentMode = 'bank_transfer';
      emi.paymentReference = `PAY-${Date.now()}-${emiData.sequence}`;
      emi.recordedBy = adminUser._id;
    }

    // Mark as overdue if past due date and not paid
    if (emiData.sequence > paidEmis && new Date(emiData.dueDate) < new Date()) {
      emi.status = 'overdue';
    }

    await emi.save();
  }

  // Update loan account stats
  await loanAccount.updatePaymentStats();

  console.log(`   ✓ Created loan: ${accountNumber} for ${customer.fullName} (${paidEmis} EMIs paid)`);

  return loanAccount;
};

/**
 * Main seed function
 */
const seed = async () => {
  try {
    console.log('\n🌱 Starting database seed...\n');

    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Clear existing data
    await clearData();
    console.log('');

    // Seed data
    const users = await seedUsers();
    const adminUser = users.find((u) => u.role === 'admin');
    console.log('');

    const products = await seedLoanProducts(adminUser);
    console.log('');

    const customers = await seedCustomers(users, adminUser);
    console.log('');

    await seedLoanAccounts(customers, products, adminUser);
    console.log('');

    // Print summary
    console.log('═'.repeat(50));
    console.log('🎉 Seed completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   • Users: ${users.length}`);
    console.log(`   • Loan Products: ${products.length}`);
    console.log(`   • Customers: ${customers.length}`);
    console.log(`   • Loan Accounts: 6`);
    console.log('');
    console.log('🔐 Login credentials:');
    console.log('   Admin:    aakash@gmail.com / Aakash1234');
    console.log('   Officer:  officer@loansphere.com / Officer@123');
    console.log('   Customer: customer@loansphere.com / Customer@123');
    console.log('   Customer: rajesh@example.com / Customer@123');
    console.log('═'.repeat(50));

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

// Run seed
seed();
