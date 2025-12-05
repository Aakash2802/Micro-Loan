// server/src/utils/addLoanProducts.js
// Quick script to add missing loan products (Home & Vehicle)
// Run with: node src/utils/addLoanProducts.js

require('dotenv').config();
const mongoose = require('mongoose');

const LoanProduct = require('../models/LoanProduct');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/loansphere';

const newProducts = [
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

const addProducts = async () => {
  try {
    console.log('\n🚀 Adding missing loan products...\n');

    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get admin user
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('❌ No admin user found. Please run seed first.');
      process.exit(1);
    }

    for (const productData of newProducts) {
      // Check if product already exists
      const existing = await LoanProduct.findOne({ code: productData.code });
      if (existing) {
        console.log(`   ⏭️  ${productData.name} already exists, skipping...`);
        continue;
      }

      const product = new LoanProduct({
        ...productData,
        createdBy: adminUser._id,
      });
      await product.save();
      console.log(`   ✓ Created: ${product.name} (${product.code})`);
    }

    console.log('\n✅ Done!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  }
};

addProducts();
