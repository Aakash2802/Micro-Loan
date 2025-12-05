// server/src/middlewares/roleMiddleware.js
const AuditLog = require('../models/AuditLog');

/**
 * Role-based Access Control Middleware
 * Restricts access based on user roles
 */

/**
 * Restrict access to specific roles
 * @param {...string} roles - Allowed roles
 * @returns {Function} - Express middleware
 *
 * Usage:
 *   router.get('/admin-only', restrictTo('admin'), controller);
 *   router.get('/staff', restrictTo('admin', 'officer'), controller);
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    // Check if user is attached (authMiddleware should run first)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
        code: 'NOT_AUTHENTICATED',
      });
    }

    // Check if user's role is in allowed roles
    if (!roles.includes(req.user.role)) {
      // Log failed authorization attempt
      AuditLog.logAuth('auth_forbidden_access', req.user.userId, {
        requiredRoles: roles,
        userRole: req.user.role,
        path: req.originalUrl,
        method: req.method,
      }, req).catch(() => {}); // Don't block response for logging failure

      return res.status(403).json({
        success: false,
        message: `Access denied. This action requires ${roles.join(' or ')} role.`,
        code: 'FORBIDDEN',
        requiredRoles: roles,
        userRole: req.user.role,
      });
    }

    next();
  };
};

/**
 * Admin only middleware
 */
const adminOnly = restrictTo('admin');

/**
 * Admin or Officer middleware (staff)
 */
const staffOnly = restrictTo('admin', 'officer');

/**
 * Customer only middleware
 */
const customerOnly = restrictTo('customer');

/**
 * Check if user is owner of the resource or is admin/officer
 * @param {Function} getOwnerId - Function to extract owner ID from request
 * @returns {Function} - Express middleware
 *
 * Usage:
 *   router.get('/profile/:id', isOwnerOrStaff(req => req.params.id), controller);
 */
const isOwnerOrStaff = (getOwnerId) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
        code: 'NOT_AUTHENTICATED',
      });
    }

    // Staff can access any resource
    if (['admin', 'officer'].includes(req.user.role)) {
      return next();
    }

    // Get owner ID from request
    const ownerId = typeof getOwnerId === 'function' ? await getOwnerId(req) : getOwnerId;

    // Check if user is the owner
    if (req.user.userId.toString() === ownerId?.toString()) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own resources.',
      code: 'NOT_OWNER',
    });
  };
};

/**
 * Check if user has permission for specific action
 * More granular permission checking
 *
 * @param {string} action - Action to check (e.g., 'loan:create', 'payment:record')
 * @returns {Function} - Express middleware
 */
const hasPermission = (action) => {
  // Permission matrix - can be extended or moved to database
  const permissions = {
    admin: [
      'user:*',
      'customer:*',
      'loan:*',
      'payment:*',
      'product:*',
      'report:*',
    ],
    officer: [
      'customer:read',
      'customer:create',
      'customer:update',
      'loan:read',
      'loan:create',
      'loan:approve',
      'payment:read',
      'payment:record',
      'product:read',
      'report:read',
    ],
    customer: [
      'customer:read:own',
      'loan:read:own',
      'payment:read:own',
    ],
  };

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
        code: 'NOT_AUTHENTICATED',
      });
    }

    const userPermissions = permissions[req.user.role] || [];
    const [resource, operation, scope] = action.split(':');

    // Check for exact match or wildcard
    const hasAccess = userPermissions.some((perm) => {
      const [permResource, permOp, permScope] = perm.split(':');

      // Wildcard resource check
      if (permOp === '*' && permResource === resource) return true;

      // Exact match
      if (perm === action) return true;

      // Base permission without scope (e.g., 'loan:read' matches 'loan:read:own')
      if (permResource === resource && permOp === operation && !permScope) return true;

      return false;
    });

    if (!hasAccess) {
      // Log permission denied attempt
      AuditLog.logAuth('auth_permission_denied', req.user.userId, {
        action,
        userRole: req.user.role,
        path: req.originalUrl,
        method: req.method,
      }, req).catch(() => {});

      return res.status(403).json({
        success: false,
        message: `Permission denied for action: ${action}`,
        code: 'PERMISSION_DENIED',
      });
    }

    // Store permission scope for controller use
    req.permissionScope = userPermissions.find(
      (p) => p.startsWith(`${resource}:${operation}`)
    )?.split(':')[2];

    next();
  };
};

/**
 * Check if customer is accessing their own data
 * Specifically for customer-related routes
 */
const isOwnCustomerData = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
      code: 'NOT_AUTHENTICATED',
    });
  }

  // Staff can access any customer data
  if (['admin', 'officer'].includes(req.user.role)) {
    return next();
  }

  // For customers, verify they're accessing their own data
  const Customer = require('../models/Customer');

  try {
    const customerId = req.params.customerId || req.params.id;

    if (customerId) {
      const customer = await Customer.findById(customerId);

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found.',
          code: 'NOT_FOUND',
        });
      }

      if (customer.userId.toString() !== req.user.userId.toString()) {
        // Log unauthorized access attempt to other customer's data
        AuditLog.logAuth('auth_unauthorized_data_access', req.user.userId, {
          targetCustomerId: customerId,
          path: req.originalUrl,
          method: req.method,
        }, req).catch(() => {});

        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own data.',
          code: 'NOT_OWNER',
        });
      }
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error verifying access.',
      code: 'ACCESS_CHECK_ERROR',
    });
  }
};

module.exports = {
  restrictTo,
  adminOnly,
  staffOnly,
  customerOnly,
  isOwnerOrStaff,
  hasPermission,
  isOwnCustomerData,
};
