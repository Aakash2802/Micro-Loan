// client/src/constants/index.js

// Loan statuses
export const LOAN_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  ACTIVE: 'active',
  OVERDUE: 'overdue',
  CLOSED: 'closed',
  REJECTED: 'rejected',
};

// EMI statuses
export const EMI_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  PARTIAL: 'partial',
  OVERDUE: 'overdue',
};

// KYC statuses
export const KYC_STATUS = {
  VERIFIED: 'verified',
  UNVERIFIED: 'unverified',
  PENDING: 'pending',
};

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  OFFICER: 'officer',
  CUSTOMER: 'customer',
};

// Payment methods
export const PAYMENT_METHODS = {
  CASH: 'cash',
  UPI: 'upi',
  BANK_TRANSFER: 'bank_transfer',
  CHEQUE: 'cheque',
  ONLINE: 'online',
};

// Employment types
export const EMPLOYMENT_TYPES = {
  SALARIED: 'salaried',
  SELF_EMPLOYED: 'self_employed',
  BUSINESS: 'business',
  RETIRED: 'retired',
  STUDENT: 'student',
  UNEMPLOYED: 'unemployed',
};

// ID proof types
export const ID_PROOF_TYPES = {
  AADHAAR: 'aadhaar',
  PAN: 'pan',
  PASSPORT: 'passport',
  VOTER_ID: 'voter_id',
  DRIVING_LICENSE: 'driving_license',
};

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  LIMIT_OPTIONS: [10, 25, 50, 100],
};

// Credit score thresholds
export const CREDIT_SCORE = {
  EXCELLENT: 80,
  GOOD: 60,
  FAIR: 40,
  POOR: 20,
};

// API response messages
export const MESSAGES = {
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logged out successfully',
  CREATE_SUCCESS: 'Created successfully',
  UPDATE_SUCCESS: 'Updated successfully',
  DELETE_SUCCESS: 'Deleted successfully',
  PAYMENT_SUCCESS: 'Payment recorded successfully',
  GENERIC_ERROR: 'Something went wrong. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  SESSION_EXPIRED: 'Session expired. Please login again.',
};

// Chart colors
export const CHART_COLORS = {
  primary: '#4F46E5',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  gray: '#6B7280',
  purple: '#8B5CF6',
  pink: '#EC4899',
};

// Date format strings
export const DATE_FORMATS = {
  DISPLAY: 'dd MMM yyyy',
  DISPLAY_TIME: 'dd MMM yyyy, hh:mm a',
  INPUT: 'yyyy-MM-dd',
  MONTH_YEAR: 'MMMM yyyy',
  SHORT: 'dd/MM/yy',
};

export default {
  LOAN_STATUS,
  EMI_STATUS,
  KYC_STATUS,
  USER_ROLES,
  PAYMENT_METHODS,
  EMPLOYMENT_TYPES,
  ID_PROOF_TYPES,
  PAGINATION,
  CREDIT_SCORE,
  MESSAGES,
  CHART_COLORS,
  DATE_FORMATS,
};
