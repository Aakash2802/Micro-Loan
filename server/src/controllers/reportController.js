// server/src/controllers/reportController.js
const LoanAccount = require('../models/LoanAccount');
const LoanProduct = require('../models/LoanProduct');
const Customer = require('../models/Customer');
const EMI = require('../models/EMI');
const AuditLog = require('../models/AuditLog');
const LoanApplication = require('../models/LoanApplication');
const { asyncHandler, APIError } = require('../middlewares/errorHandler');
const { generateLoanStatement, generateEMIReceipt, generatePaymentSummaryReport, generateEMISchedulePDF } = require('../utils/pdfGenerator');

/**
 * @desc    Get dashboard summary statistics
 * @route   GET /api/reports/dashboard
 * @access  Private/Staff
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfYear = new Date(today.getFullYear(), 0, 1);

  // Parallel queries for performance
  const [
    loanStats,
    emiStats,
    customerStats,
    monthlyCollection,
    weeklyCollection,
    recentLoans,
    applicationStats,
  ] = await Promise.all([
    // Loan statistics
    LoanAccount.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: null,
          totalLoans: { $sum: 1 },
          activeLoans: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
          },
          overdueLoans: {
            $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] },
          },
          npaLoans: {
            $sum: { $cond: [{ $eq: ['$status', 'npa'] }, 1, 0] },
          },
          closedLoans: {
            $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] },
          },
          totalDisbursed: { $sum: '$principal' },
          totalOutstanding: { $sum: '$outstandingAmount' },
          totalCollected: { $sum: '$totalPaid' },
        },
      },
    ]),

    // EMI statistics
    EMI.aggregate([
      {
        $group: {
          _id: null,
          totalEMIs: { $sum: 1 },
          paidEMIs: {
            $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] },
          },
          overdueEMIs: {
            $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] },
          },
          totalPenalty: { $sum: '$penaltyAmount' },
          overdueAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'overdue'] }, '$amount', 0],
            },
          },
        },
      },
    ]),

    // Customer statistics
    Customer.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          verifiedKYC: {
            $sum: { $cond: [{ $eq: ['$kycStatus', 'verified'] }, 1, 0] },
          },
          pendingKYC: {
            $sum: { $cond: [{ $eq: ['$kycStatus', 'pending'] }, 1, 0] },
          },
        },
      },
    ]),

    // Monthly collection trend
    EMI.aggregate([
      {
        $match: {
          status: 'paid',
          paidDate: { $gte: startOfYear },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$paidDate' },
            month: { $month: '$paidDate' },
          },
          amount: { $sum: '$paidAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),

    // Weekly collection trend (last 8 weeks)
    EMI.aggregate([
      {
        $match: {
          status: 'paid',
          paidDate: { $gte: new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: {
            year: { $isoWeekYear: '$paidDate' },
            week: { $isoWeek: '$paidDate' },
          },
          amount: { $sum: '$paidAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } },
    ]),

    // Recent loans
    LoanAccount.find({ isDeleted: false })
      .populate('customerId', 'fullName')
      .populate('productId', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('accountNumber principal status createdAt'),

    // Loan application statistics (pending reviews and recommendations)
    LoanApplication.aggregate([
      {
        $group: {
          _id: null,
          totalApplications: { $sum: 1 },
          pendingReview: {
            $sum: { $cond: [{ $in: ['$status', ['pending', 'under_review']] }, 1, 0] },
          },
          pendingRecommendations: {
            $sum: { $cond: [{ $eq: ['$status', 'recommended'] }, 1, 0] },
          },
          approved: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] },
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] },
          },
        },
      },
    ]),
  ]);

  // Format data
  const stats = loanStats[0] || {
    totalLoans: 0,
    activeLoans: 0,
    overdueLoans: 0,
    npaLoans: 0,
    closedLoans: 0,
    totalDisbursed: 0,
    totalOutstanding: 0,
    totalCollected: 0,
  };

  const emiData = emiStats[0] || {
    totalEMIs: 0,
    paidEMIs: 0,
    overdueEMIs: 0,
    totalPenalty: 0,
    overdueAmount: 0,
  };

  const customerData = customerStats[0] || {
    totalCustomers: 0,
    verifiedKYC: 0,
    pendingKYC: 0,
  };

  const applicationData = applicationStats[0] || {
    totalApplications: 0,
    pendingReview: 0,
    pendingRecommendations: 0,
    approved: 0,
    rejected: 0,
  };

  // Format monthly trend
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const collectionTrend = monthlyCollection.map((item) => ({
    month: monthNames[item._id.month - 1],
    year: item._id.year,
    amount: item.amount,
    count: item.count,
  }));

  // Format weekly trend
  const weeklyTrend = weeklyCollection.map((item) => ({
    week: `W${item._id.week}`,
    year: item._id.year,
    amount: item.amount,
    count: item.count,
  }));

  res.json({
    success: true,
    data: {
      summary: {
        totalLoans: stats.totalLoans,
        activeLoans: stats.activeLoans,
        overdueLoans: stats.overdueLoans,
        npaLoans: stats.npaLoans,
        closedLoans: stats.closedLoans,
        totalDisbursed: stats.totalDisbursed,
        totalOutstanding: stats.totalOutstanding,
        totalCollected: stats.totalCollected,
        overdueAmount: emiData.overdueAmount,
        npaPercentage: stats.totalLoans > 0
          ? Math.round((stats.npaLoans / stats.totalLoans) * 100 * 100) / 100
          : 0,
      },
      emis: {
        total: emiData.totalEMIs,
        paid: emiData.paidEMIs,
        overdue: emiData.overdueEMIs,
        totalPenalty: emiData.totalPenalty,
      },
      customers: {
        total: customerData.totalCustomers,
        verifiedKYC: customerData.verifiedKYC,
        pendingKYC: customerData.pendingKYC,
      },
      applications: {
        total: applicationData.totalApplications,
        pendingReview: applicationData.pendingReview,
        pendingRecommendations: applicationData.pendingRecommendations,
        approved: applicationData.approved,
        rejected: applicationData.rejected,
      },
      collectionTrend,
      weeklyTrend,
      recentLoans,
    },
  });
});

/**
 * @desc    Get loan performance analytics
 * @route   GET /api/reports/loan-performance
 * @access  Private/Staff
 */
const getLoanPerformance = asyncHandler(async (req, res) => {
  const { startDate, endDate, productId } = req.query;

  const matchQuery = { isDeleted: false };

  if (startDate && endDate) {
    matchQuery.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  if (productId) {
    matchQuery.productId = productId;
  }

  // Performance by product
  const byProduct = await LoanAccount.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$productId',
        totalLoans: { $sum: 1 },
        totalDisbursed: { $sum: '$principal' },
        totalOutstanding: { $sum: '$outstandingAmount' },
        totalCollected: { $sum: '$totalPaid' },
        avgLoanAmount: { $avg: '$principal' },
        overdueCount: {
          $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] },
        },
      },
    },
    {
      $lookup: {
        from: 'loanproducts',
        localField: '_id',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: '$product' },
    {
      $project: {
        productName: '$product.name',
        productCode: '$product.code',
        totalLoans: 1,
        totalDisbursed: 1,
        totalOutstanding: 1,
        totalCollected: 1,
        avgLoanAmount: 1,
        overdueCount: 1,
        overduePercentage: {
          $multiply: [{ $divide: ['$overdueCount', '$totalLoans'] }, 100],
        },
      },
    },
    { $sort: { totalDisbursed: -1 } },
  ]);

  // Status distribution
  const byStatus = await LoanAccount.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        amount: { $sum: '$principal' },
      },
    },
    { $sort: { count: -1 } },
  ]);

  // Risk distribution
  const byRisk = await LoanAccount.aggregate([
    { $match: { ...matchQuery, status: { $in: ['active', 'overdue', 'npa'] } } },
    {
      $group: {
        _id: '$riskCategory',
        count: { $sum: 1 },
        totalOutstanding: { $sum: '$outstandingAmount' },
      },
    },
    { $sort: { count: -1 } },
  ]);

  res.json({
    success: true,
    data: {
      byProduct,
      byStatus,
      byRisk,
    },
  });
});

/**
 * @desc    Get collection report
 * @route   GET /api/reports/collections
 * @access  Private/Staff
 */
const getCollectionReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, groupBy = 'day' } = req.query;

  const start = new Date(startDate || new Date().setDate(new Date().getDate() - 30));
  const end = new Date(endDate || new Date());

  let dateFormat;
  switch (groupBy) {
    case 'month':
      dateFormat = { year: { $year: '$paidDate' }, month: { $month: '$paidDate' } };
      break;
    case 'week':
      dateFormat = { year: { $year: '$paidDate' }, week: { $week: '$paidDate' } };
      break;
    default:
      dateFormat = {
        year: { $year: '$paidDate' },
        month: { $month: '$paidDate' },
        day: { $dayOfMonth: '$paidDate' },
      };
  }

  const collections = await EMI.aggregate([
    {
      $match: {
        status: 'paid',
        paidDate: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: dateFormat,
        totalAmount: { $sum: '$paidAmount' },
        penaltyAmount: { $sum: '$penaltyAmount' },
        transactionCount: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
  ]);

  // Collection by payment mode
  const byMode = await EMI.aggregate([
    {
      $match: {
        status: 'paid',
        paidDate: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: '$paymentMode',
        totalAmount: { $sum: '$paidAmount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { totalAmount: -1 } },
  ]);

  // Summary
  const summary = await EMI.aggregate([
    {
      $match: {
        status: 'paid',
        paidDate: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: null,
        totalCollected: { $sum: '$paidAmount' },
        totalPenalty: { $sum: '$penaltyAmount' },
        totalTransactions: { $sum: 1 },
        avgPayment: { $avg: '$paidAmount' },
      },
    },
  ]);

  res.json({
    success: true,
    data: {
      dateRange: { start, end },
      summary: summary[0] || {
        totalCollected: 0,
        totalPenalty: 0,
        totalTransactions: 0,
        avgPayment: 0,
      },
      collections,
      byMode,
    },
  });
});

/**
 * @desc    Get overdue/NPA report
 * @route   GET /api/reports/overdue
 * @access  Private/Staff
 */
const getOverdueReport = asyncHandler(async (req, res) => {
  const { daysOverdue = 0 } = req.query;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - parseInt(daysOverdue));

  // Overdue by age bucket
  const byAgeBucket = await EMI.aggregate([
    { $match: { status: 'overdue' } },
    {
      $addFields: {
        daysOverdue: {
          $divide: [{ $subtract: [new Date(), '$dueDate'] }, 1000 * 60 * 60 * 24],
        },
      },
    },
    {
      $bucket: {
        groupBy: '$daysOverdue',
        boundaries: [0, 30, 60, 90, 180, 365, Infinity],
        default: 'Other',
        output: {
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    },
  ]);

  // Format age buckets
  const ageBucketLabels = ['0-30 days', '30-60 days', '60-90 days', '90-180 days', '180-365 days', '365+ days'];
  const formattedBuckets = byAgeBucket.map((bucket, index) => ({
    label: ageBucketLabels[index] || 'Other',
    count: bucket.count,
    totalAmount: bucket.totalAmount,
  }));

  // Top overdue customers
  const topOverdue = await LoanAccount.aggregate([
    { $match: { status: { $in: ['overdue', 'npa'] } } },
    {
      $lookup: {
        from: 'customers',
        localField: 'customerId',
        foreignField: '_id',
        as: 'customer',
      },
    },
    { $unwind: '$customer' },
    {
      $project: {
        accountNumber: 1,
        customerName: '$customer.fullName',
        phone: '$customer.phone',
        outstandingAmount: 1,
        overdueEMIs: 1,
        riskCategory: 1,
        nextDueDate: 1,
      },
    },
    { $sort: { outstandingAmount: -1 } },
    { $limit: 20 },
  ]);

  // Summary
  const summary = await LoanAccount.aggregate([
    { $match: { status: { $in: ['overdue', 'npa'] } } },
    {
      $group: {
        _id: null,
        totalOverdueLoans: { $sum: 1 },
        totalOverdueAmount: { $sum: '$outstandingAmount' },
        npaLoans: {
          $sum: { $cond: [{ $eq: ['$status', 'npa'] }, 1, 0] },
        },
        npaAmount: {
          $sum: { $cond: [{ $eq: ['$status', 'npa'] }, '$outstandingAmount', 0] },
        },
      },
    },
  ]);

  res.json({
    success: true,
    data: {
      summary: summary[0] || {
        totalOverdueLoans: 0,
        totalOverdueAmount: 0,
        npaLoans: 0,
        npaAmount: 0,
      },
      byAgeBucket: formattedBuckets,
      topOverdue,
    },
  });
});

/**
 * @desc    Generate loan statement PDF
 * @route   GET /api/reports/loan-statement/:loanAccountId
 * @access  Private
 */
const downloadLoanStatement = asyncHandler(async (req, res) => {
  const loan = await LoanAccount.findById(req.params.loanAccountId)
    .populate('productId');

  if (!loan || loan.isDeleted) {
    throw new APIError('Loan account not found', 404, 'LOAN_NOT_FOUND');
  }

  // For customers, verify ownership
  if (req.user.role === 'customer') {
    const customer = await Customer.findOne({ userId: req.user.userId });
    if (!customer || loan.customerId.toString() !== customer._id.toString()) {
      throw new APIError('Access denied', 403, 'NOT_OWNER');
    }
  }

  const customer = await Customer.findById(loan.customerId);
  const emis = await EMI.find({ loanAccountId: loan._id }).sort({ sequence: 1 });

  const pdfBuffer = await generateLoanStatement(loan, customer, emis);

  // Audit log
  await AuditLog.log({
    type: 'statement_download',
    userId: req.user.userId,
    loanAccountId: loan._id,
    message: `Loan statement downloaded: ${loan.accountNumber}`,
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=LoanStatement_${loan.accountNumber}.pdf`
  );
  res.send(pdfBuffer);
});

/**
 * @desc    Generate EMI receipt PDF
 * @route   GET /api/reports/emi-receipt/:emiId
 * @access  Private
 */
const downloadEMIReceipt = asyncHandler(async (req, res) => {
  const emi = await EMI.findById(req.params.emiId);

  if (!emi) {
    throw new APIError('EMI not found', 404, 'EMI_NOT_FOUND');
  }

  if (emi.status !== 'paid') {
    throw new APIError('Cannot generate receipt for unpaid EMI', 400, 'NOT_PAID');
  }

  const loan = await LoanAccount.findById(emi.loanAccountId);

  // For customers, verify ownership
  if (req.user.role === 'customer') {
    const customer = await Customer.findOne({ userId: req.user.userId });
    if (!customer || loan.customerId.toString() !== customer._id.toString()) {
      throw new APIError('Access denied', 403, 'NOT_OWNER');
    }
  }

  const customer = await Customer.findById(loan.customerId);
  const pdfBuffer = await generateEMIReceipt(emi, loan, customer);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=EMI_Receipt_${loan.accountNumber}_${emi.sequence}.pdf`
  );
  res.send(pdfBuffer);
});

/**
 * @desc    Export EMI schedule as PDF
 * @route   GET /api/reports/export/emis/:loanAccountId
 * @access  Private
 */
const exportEMIHistory = asyncHandler(async (req, res) => {
  const loan = await LoanAccount.findById(req.params.loanAccountId)
    .populate('productId');

  if (!loan || loan.isDeleted) {
    throw new APIError('Loan account not found', 404, 'LOAN_NOT_FOUND');
  }

  // For customers, verify ownership
  if (req.user.role === 'customer') {
    const customer = await Customer.findOne({ userId: req.user.userId });
    if (!customer || loan.customerId.toString() !== customer._id.toString()) {
      throw new APIError('Access denied', 403, 'NOT_OWNER');
    }
  }

  const customer = await Customer.findById(loan.customerId);
  const emis = await EMI.find({ loanAccountId: loan._id }).sort({ sequence: 1 });

  // Generate PDF
  const pdfBuffer = await generateEMISchedulePDF(loan, customer, emis);

  // Audit log
  await AuditLog.log({
    type: 'emi_schedule_download',
    userId: req.user.userId,
    loanAccountId: loan._id,
    message: `EMI schedule downloaded: ${loan.accountNumber}`,
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=EMISchedule_${loan.accountNumber}.pdf`
  );
  res.send(pdfBuffer);
});

/**
 * @desc    Get audit logs
 * @route   GET /api/reports/audit-logs
 * @access  Private/Admin
 */
const getAuditLogs = asyncHandler(async (req, res) => {
  const {
    type,
    userId,
    loanAccountId,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = req.query;

  const query = {};

  if (type) query.type = type;
  if (userId) query.userId = userId;
  if (loanAccountId) query.loanAccountId = loanAccountId;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    AuditLog.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

module.exports = {
  getDashboardStats,
  getLoanPerformance,
  getCollectionReport,
  getOverdueReport,
  downloadLoanStatement,
  downloadEMIReceipt,
  exportEMIHistory,
  getAuditLogs,
};
