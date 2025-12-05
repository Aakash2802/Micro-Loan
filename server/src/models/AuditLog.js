// server/src/models/AuditLog.js
const mongoose = require('mongoose');

/**
 * Audit Log Schema
 * Tracks all important actions in the system for compliance and debugging
 */
const auditLogSchema = new mongoose.Schema(
  {
    // Type of action performed
    type: {
      type: String,
      required: [true, 'Audit type is required'],
      enum: [
        // Authentication
        'auth_login',
        'auth_logout',
        'auth_register',
        'auth_password_reset',
        'auth_failed_login',

        // Customer actions
        'customer_create',
        'customer_update',
        'customer_delete',
        'customer_kyc_submit',
        'customer_kyc_verify',
        'customer_kyc_reject',

        // Loan product actions
        'product_create',
        'product_update',
        'product_delete',
        'product_activate',
        'product_deactivate',

        // Loan account actions
        'loan_apply',
        'loan_approve',
        'loan_reject',
        'loan_disburse',
        'loan_close',
        'loan_foreclose',
        'loan_default',
        'loan_update',

        // EMI actions
        'emi_generate',
        'emi_payment',
        'emi_partial_payment',
        'emi_penalty_apply',
        'emi_penalty_waive',
        'emi_waive',
        'emi_reschedule',

        // Report actions
        'report_generate',
        'report_export',
        'statement_download',

        // System actions
        'system_error',
        'system_config_change',
        'data_export',
        'data_import',

        // Other
        'other',
      ],
      index: true,
    },
    // User who performed the action
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    // Related entities
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    loanAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LoanAccount',
    },
    emiId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EMI',
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LoanProduct',
    },
    // Description of the action
    message: {
      type: String,
      required: [true, 'Audit message is required'],
      trim: true,
    },
    // Detailed data (for before/after comparison)
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Previous state (for update operations)
    previousState: {
      type: mongoose.Schema.Types.Mixed,
    },
    // New state (for update operations)
    newState: {
      type: mongoose.Schema.Types.Mixed,
    },
    // Amount involved (if applicable)
    amount: {
      type: Number,
    },
    // Status of the action
    status: {
      type: String,
      enum: ['success', 'failure', 'pending'],
      default: 'success',
    },
    // Error details if failed
    errorMessage: {
      type: String,
    },
    errorStack: {
      type: String,
    },
    // Request metadata
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    requestMethod: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    },
    requestPath: {
      type: String,
    },
    // Session/Request ID for tracing
    sessionId: {
      type: String,
    },
    requestId: {
      type: String,
    },
    // Duration of the operation in ms
    duration: {
      type: Number,
    },
  },
  {
    timestamps: true,
    // Don't include __v field
    versionKey: false,
  }
);

// Indexes for efficient querying
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ type: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ loanAccountId: 1, createdAt: -1 });
auditLogSchema.index({ customerId: 1, createdAt: -1 });

// TTL index - automatically delete logs older than 2 years
// Uncomment if you want automatic cleanup
// auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 });

/**
 * Static method to create audit log entry
 * @param {Object} data - Audit log data
 * @returns {Promise<AuditLog>}
 */
auditLogSchema.statics.log = async function (data) {
  try {
    const auditLog = new this(data);
    await auditLog.save();
    return auditLog;
  } catch (error) {
    // Log to console if audit logging fails (don't break the main operation)
    console.error('Failed to create audit log:', error.message);
    return null;
  }
};

/**
 * Static method to log authentication events
 */
auditLogSchema.statics.logAuth = async function (type, userId, details, req) {
  return this.log({
    type,
    userId,
    message: `Authentication: ${type.replace('auth_', '')}`,
    details,
    ipAddress: req?.ip,
    userAgent: req?.get('user-agent'),
    requestMethod: req?.method,
    requestPath: req?.originalUrl,
  });
};

/**
 * Static method to log loan operations
 */
auditLogSchema.statics.logLoan = async function (
  type,
  userId,
  loanAccountId,
  message,
  details = {},
  amount = null
) {
  return this.log({
    type,
    userId,
    loanAccountId,
    message,
    details,
    amount,
  });
};

/**
 * Static method to log payment operations
 */
auditLogSchema.statics.logPayment = async function (
  userId,
  loanAccountId,
  emiId,
  amount,
  details = {}
) {
  return this.log({
    type: 'emi_payment',
    userId,
    loanAccountId,
    emiId,
    message: `EMI payment recorded: ₹${amount}`,
    details,
    amount,
  });
};

/**
 * Get audit trail for a specific loan account
 * @param {ObjectId} loanAccountId
 * @param {Object} options - Pagination options
 */
auditLogSchema.statics.getLoanAuditTrail = async function (
  loanAccountId,
  { page = 1, limit = 50 } = {}
) {
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    this.find({ loanAccountId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email role')
      .lean(),
    this.countDocuments({ loanAccountId }),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get audit trail for a specific user
 */
auditLogSchema.statics.getUserAuditTrail = async function (
  userId,
  { page = 1, limit = 50 } = {}
) {
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    this.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments({ userId }),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get summary statistics for dashboard
 */
auditLogSchema.statics.getActionSummary = async function (startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      },
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalAmount: { $sum: { $ifNull: ['$amount', 0] } },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
