// server/src/controllers/loanProductController.js
const { validationResult } = require('express-validator');
const LoanProduct = require('../models/LoanProduct');
const LoanAccount = require('../models/LoanAccount');
const AuditLog = require('../models/AuditLog');
const { asyncHandler, APIError, createValidationError } = require('../middlewares/errorHandler');

/**
 * @desc    Get all loan products
 * @route   GET /api/loan-products
 * @access  Private
 */
const getLoanProducts = asyncHandler(async (req, res) => {
  const {
    active,
    published,
    category,
    page = 1,
    limit = 20
  } = req.query;

  const query = {};

  // Filter by active status
  if (active !== undefined) {
    query.isActive = active === 'true';
  }

  // Filter by published status
  if (published !== undefined) {
    query.isPublished = published === 'true';
  }

  // Filter by category
  if (category) {
    query.category = category;
  }

  // For customers, only show active published products
  if (req.user.role === 'customer') {
    query.isActive = true;
    query.isPublished = true;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [products, total] = await Promise.all([
    LoanProduct.find(query)
      .sort({ category: 1, name: 1 })
      .skip(skip)
      .limit(parseInt(limit)),
    LoanProduct.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

/**
 * @desc    Get single loan product
 * @route   GET /api/loan-products/:id
 * @access  Private
 */
const getLoanProductById = asyncHandler(async (req, res) => {
  const product = await LoanProduct.findById(req.params.id)
    .populate('createdBy', 'name')
    .populate('updatedBy', 'name');

  if (!product) {
    throw new APIError('Loan product not found', 404, 'PRODUCT_NOT_FOUND');
  }

  // For customers, only show active published products
  if (req.user.role === 'customer' && (!product.isActive || !product.isPublished)) {
    throw new APIError('Loan product not found', 404, 'PRODUCT_NOT_FOUND');
  }

  // Get usage statistics
  const stats = await LoanAccount.aggregate([
    { $match: { productId: product._id } },
    {
      $group: {
        _id: null,
        totalLoans: { $sum: 1 },
        totalDisbursed: { $sum: '$principal' },
        activeLoans: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
        },
      },
    },
  ]);

  res.json({
    success: true,
    data: {
      product,
      stats: stats[0] || { totalLoans: 0, totalDisbursed: 0, activeLoans: 0 },
    },
  });
});

/**
 * @desc    Create loan product
 * @route   POST /api/loan-products
 * @access  Private/Admin
 */
const createLoanProduct = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError(errors);
  }

  const {
    name,
    description,
    code,
    category,
    interestRate,
    interestType,
    minTenureMonths,
    maxTenureMonths,
    minAmount,
    maxAmount,
    processingFee,
    processingFeeType,
    latePenaltyRate,
    latePenaltyType,
    gracePeriodDays,
    prepaymentAllowed,
    prepaymentPenaltyRate,
    eligibilityCriteria,
    requiredDocuments,
    isActive,
    isPublished,
    effectiveFrom,
    effectiveTo,
  } = req.body;

  // Check for duplicate code
  const existingProduct = await LoanProduct.findOne({ code: code.toUpperCase() });
  if (existingProduct) {
    throw new APIError('Product code already exists', 409, 'CODE_EXISTS');
  }

  // Check for duplicate name
  const existingName = await LoanProduct.findOne({ name });
  if (existingName) {
    throw new APIError('Product name already exists', 409, 'NAME_EXISTS');
  }

  const product = new LoanProduct({
    name,
    description,
    code: code.toUpperCase(),
    category: category || 'personal',
    interestRate,
    interestType: interestType || 'reducing',
    minTenureMonths,
    maxTenureMonths,
    minAmount,
    maxAmount,
    processingFee: processingFee || 0,
    processingFeeType: processingFeeType || 'percentage',
    latePenaltyRate: latePenaltyRate || 2,
    latePenaltyType: latePenaltyType || 'percentage',
    gracePeriodDays: gracePeriodDays || 0,
    prepaymentAllowed: prepaymentAllowed !== false,
    prepaymentPenaltyRate: prepaymentPenaltyRate || 0,
    eligibilityCriteria,
    requiredDocuments: requiredDocuments || ['aadhaar', 'pan'],
    isActive: isActive !== false,
    isPublished: isPublished || false,
    effectiveFrom: effectiveFrom || new Date(),
    effectiveTo,
    createdBy: req.user.userId,
  });

  await product.save();

  await AuditLog.log({
    type: 'product_create',
    userId: req.user.userId,
    productId: product._id,
    message: `Loan product created: ${name} (${code})`,
    details: { interestRate, minAmount, maxAmount },
  });

  res.status(201).json({
    success: true,
    message: 'Loan product created successfully',
    data: { product },
  });
});

/**
 * @desc    Update loan product
 * @route   PUT /api/loan-products/:id
 * @access  Private/Admin
 */
const updateLoanProduct = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError(errors);
  }

  const product = await LoanProduct.findById(req.params.id);
  if (!product) {
    throw new APIError('Loan product not found', 404, 'PRODUCT_NOT_FOUND');
  }

  const previousState = product.toObject();

  // Fields that can be updated
  const updateableFields = [
    'name',
    'description',
    'interestRate',
    'interestType',
    'minTenureMonths',
    'maxTenureMonths',
    'minAmount',
    'maxAmount',
    'processingFee',
    'processingFeeType',
    'latePenaltyRate',
    'latePenaltyType',
    'gracePeriodDays',
    'prepaymentAllowed',
    'prepaymentPenaltyRate',
    'eligibilityCriteria',
    'requiredDocuments',
    'isActive',
    'isPublished',
    'effectiveFrom',
    'effectiveTo',
  ];

  updateableFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      product[field] = req.body[field];
    }
  });

  product.updatedBy = req.user.userId;
  await product.save();

  await AuditLog.log({
    type: 'product_update',
    userId: req.user.userId,
    productId: product._id,
    message: `Loan product updated: ${product.name}`,
    previousState,
    newState: product.toObject(),
  });

  res.json({
    success: true,
    message: 'Loan product updated successfully',
    data: { product },
  });
});

/**
 * @desc    Toggle product active status
 * @route   PATCH /api/loan-products/:id/toggle-active
 * @access  Private/Admin
 */
const toggleProductActive = asyncHandler(async (req, res) => {
  const product = await LoanProduct.findById(req.params.id);

  if (!product) {
    throw new APIError('Loan product not found', 404, 'PRODUCT_NOT_FOUND');
  }

  product.isActive = !product.isActive;
  product.updatedBy = req.user.userId;

  // If deactivating, also unpublish
  if (!product.isActive) {
    product.isPublished = false;
  }

  await product.save();

  await AuditLog.log({
    type: product.isActive ? 'product_activate' : 'product_deactivate',
    userId: req.user.userId,
    productId: product._id,
    message: `Loan product ${product.isActive ? 'activated' : 'deactivated'}: ${product.name}`,
  });

  res.json({
    success: true,
    message: `Product ${product.isActive ? 'activated' : 'deactivated'} successfully`,
    data: { product },
  });
});

/**
 * @desc    Toggle product published status
 * @route   PATCH /api/loan-products/:id/toggle-publish
 * @access  Private/Admin
 */
const toggleProductPublish = asyncHandler(async (req, res) => {
  const product = await LoanProduct.findById(req.params.id);

  if (!product) {
    throw new APIError('Loan product not found', 404, 'PRODUCT_NOT_FOUND');
  }

  // Can only publish active products
  if (!product.isActive && !product.isPublished) {
    throw new APIError('Cannot publish inactive product', 400, 'PRODUCT_INACTIVE');
  }

  product.isPublished = !product.isPublished;
  product.updatedBy = req.user.userId;
  await product.save();

  res.json({
    success: true,
    message: `Product ${product.isPublished ? 'published' : 'unpublished'} successfully`,
    data: { product },
  });
});

/**
 * @desc    Delete loan product (soft delete)
 * @route   DELETE /api/loan-products/:id
 * @access  Private/Admin
 */
const deleteLoanProduct = asyncHandler(async (req, res) => {
  const product = await LoanProduct.findById(req.params.id);

  if (!product) {
    throw new APIError('Loan product not found', 404, 'PRODUCT_NOT_FOUND');
  }

  // Check if product has any loans
  const loanCount = await LoanAccount.countDocuments({ productId: product._id });
  if (loanCount > 0) {
    throw new APIError(
      'Cannot delete product with existing loans. Deactivate instead.',
      400,
      'HAS_LOANS'
    );
  }

  await product.deleteOne();

  await AuditLog.log({
    type: 'product_delete',
    userId: req.user.userId,
    productId: product._id,
    message: `Loan product deleted: ${product.name}`,
  });

  res.json({
    success: true,
    message: 'Loan product deleted successfully',
  });
});

/**
 * @desc    Calculate EMI preview for a product
 * @route   POST /api/loan-products/:id/calculate-emi
 * @access  Private
 */
const calculateEMIPreview = asyncHandler(async (req, res) => {
  const { principal, tenureMonths } = req.body;

  const product = await LoanProduct.findById(req.params.id);
  if (!product) {
    throw new APIError('Loan product not found', 404, 'PRODUCT_NOT_FOUND');
  }

  // Validate principal
  if (principal < product.minAmount || principal > product.maxAmount) {
    throw new APIError(
      `Principal must be between ₹${product.minAmount} and ₹${product.maxAmount}`,
      400,
      'INVALID_PRINCIPAL'
    );
  }

  // Validate tenure
  if (tenureMonths < product.minTenureMonths || tenureMonths > product.maxTenureMonths) {
    throw new APIError(
      `Tenure must be between ${product.minTenureMonths} and ${product.maxTenureMonths} months`,
      400,
      'INVALID_TENURE'
    );
  }

  const { generateAmortizationSchedule } = require('../utils/emiCalculator');

  const { summary, schedule } = generateAmortizationSchedule(
    principal,
    product.interestRate,
    tenureMonths,
    new Date(),
    product.interestType
  );

  const processingFee = product.calculateProcessingFee(principal);

  res.json({
    success: true,
    data: {
      product: {
        name: product.name,
        code: product.code,
        interestRate: product.interestRate,
        interestType: product.interestType,
      },
      calculation: {
        principal,
        tenureMonths,
        emiAmount: summary.emiAmount,
        totalInterest: summary.totalInterest,
        totalPayable: summary.totalPayable,
        processingFee,
        disbursedAmount: principal - processingFee,
      },
      schedule: schedule.slice(0, 12), // First 12 EMIs for preview
    },
  });
});

/**
 * @desc    Get product categories
 * @route   GET /api/loan-products/categories
 * @access  Private
 */
const getCategories = asyncHandler(async (req, res) => {
  const categories = await LoanProduct.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        products: { $push: { name: '$name', code: '$code' } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    success: true,
    data: { categories },
  });
});

module.exports = {
  getLoanProducts,
  getLoanProductById,
  createLoanProduct,
  updateLoanProduct,
  toggleProductActive,
  toggleProductPublish,
  deleteLoanProduct,
  calculateEMIPreview,
  getCategories,
};
