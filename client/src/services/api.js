// client/src/services/api.js
import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response } = error;

    // Handle specific error codes
    if (response) {
      switch (response.status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          if (response.data?.code === 'TOKEN_EXPIRED' || response.data?.code === 'INVALID_TOKEN') {
            localStorage.removeItem('token');
            window.location.href = '/login';
            toast.error('Session expired. Please login again.');
          }
          break;
        case 403:
          toast.error('You do not have permission to perform this action');
          break;
        case 404:
          // Don't show toast for 404, let components handle it
          break;
        case 429:
          toast.error('Too many requests. Please wait and try again.');
          break;
        case 500:
          toast.error('Server error. Please try again later.');
          break;
        default:
          // Don't show generic error toast, let components handle specific errors
          break;
      }
    } else if (error.code === 'ECONNABORTED') {
      toast.error('Request timeout. Please check your connection.');
    } else if (!navigator.onLine) {
      toast.error('No internet connection');
    }

    return Promise.reject(error);
  }
);

// ==================
// Auth API
// ==================

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updatePassword: (data) => api.put('/auth/password', data),
  updateProfile: (data) => api.put('/auth/profile', data),
  getUsers: (params) => api.get('/auth/users', { params }),
  createUser: (data) => api.post('/auth/users', data),
  toggleUserStatus: (id) => api.patch(`/auth/users/${id}/toggle-status`),
  // 2FA endpoints
  verifyOTP: (data) => api.post('/auth/verify-otp', data),
  resendOTP: (data) => api.post('/auth/resend-otp', data),
  get2FAStatus: () => api.get('/auth/2fa/status'),
  enable2FA: (data) => api.post('/auth/2fa/enable', data),
  confirm2FA: (data) => api.post('/auth/2fa/confirm', data),
  disable2FA: (data) => api.post('/auth/2fa/disable', data),
};

// ==================
// Customer API
// ==================

export const customerAPI = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  addKycDoc: (id, data) => api.post(`/customers/${id}/kyc`, data),
  verifyKyc: (id, docId, data) => api.patch(`/customers/${id}/kyc/${docId}/verify`, data),
  getCreditScore: (id) => api.get(`/customers/${id}/credit-score`),
  getMyProfile: () => api.get('/customers/my-profile'),
  updateMyProfile: (data) => api.put('/customers/my-profile', data),
  // Notes
  getNotes: (id, params) => api.get(`/customers/${id}/notes`, { params }),
  addNote: (id, data) => api.post(`/customers/${id}/notes`, data),
  updateNote: (id, noteId, data) => api.put(`/customers/${id}/notes/${noteId}`, data),
  deleteNote: (id, noteId) => api.delete(`/customers/${id}/notes/${noteId}`),
  toggleNotePin: (id, noteId) => api.patch(`/customers/${id}/notes/${noteId}/pin`),
  completeFollowUp: (id, noteId) => api.patch(`/customers/${id}/notes/${noteId}/complete-followup`),
  getPendingFollowUps: (params) => api.get('/customers/notes/follow-ups', { params }),
  getNoteTypes: () => api.get('/customers/notes/types'),
};

// ==================
// Loan Product API
// ==================

export const loanProductAPI = {
  getAll: (params) => api.get('/loan-products', { params }),
  getById: (id) => api.get(`/loan-products/${id}`),
  create: (data) => api.post('/loan-products', data),
  update: (id, data) => api.put(`/loan-products/${id}`, data),
  delete: (id) => api.delete(`/loan-products/${id}`),
  toggleActive: (id) => api.patch(`/loan-products/${id}/toggle-active`),
  togglePublish: (id) => api.patch(`/loan-products/${id}/toggle-publish`),
  calculateEMI: (id, data) => api.post(`/loan-products/${id}/calculate-emi`, data),
  getCategories: () => api.get('/loan-products/categories'),
};

// ==================
// Loan Account API
// ==================

export const loanAccountAPI = {
  getAll: (params) => api.get('/loan-accounts', { params }),
  getById: (id) => api.get(`/loan-accounts/${id}`),
  create: (data) => api.post('/loan-accounts', data),
  approve: (id, data) => api.patch(`/loan-accounts/${id}/approve`, data),
  reject: (id, data) => api.patch(`/loan-accounts/${id}/reject`, data),
  disburse: (id, data) => api.post(`/loan-accounts/${id}/disburse`, data),
  close: (id, data) => api.post(`/loan-accounts/${id}/close`, data),
  getEMIs: (id, params) => api.get(`/loan-accounts/${id}/emis`, { params }),
  getRiskScore: (id) => api.get(`/loan-accounts/${id}/risk-score`),
  getOverdue: (params) => api.get('/loan-accounts/overdue', { params }),
  getMyLoans: () => api.get('/loan-accounts/my-loans'),
  // Loan restructuring
  previewRestructure: (id, data) => api.post(`/loan-accounts/${id}/restructure/preview`, data),
  restructure: (id, data) => api.post(`/loan-accounts/${id}/restructure`, data),
};

// ==================
// Loan Application API (Customer Self-Service)
// ==================

export const loanApplicationAPI = {
  // Customer endpoints
  getProducts: () => api.get('/loan-applications/products'),
  checkEligibility: (data) => api.post('/loan-applications/check-eligibility', data),
  submit: (data) => api.post('/loan-applications', data),
  getMyApplications: () => api.get('/loan-applications/my-applications'),
  getMyApplicationById: (id) => api.get(`/loan-applications/my-applications/${id}`),
  // Staff endpoints
  getAll: (params) => api.get('/loan-applications', { params }),
  getById: (id) => api.get(`/loan-applications/${id}`),
  review: (id, data) => api.patch(`/loan-applications/${id}/review`, data),
  getConfig: () => api.get('/loan-applications/config'),
};

// ==================
// Payment API (Staff)
// ==================

export const paymentAPI = {
  record: (data) => api.post('/payments/record', data),
  recordBulk: (data) => api.post('/payments/record-bulk', data),
  waivePenalty: (data) => api.post('/payments/waive-penalty', data),
  getHistory: (loanAccountId, params) =>
    api.get(`/payments/history/${loanAccountId}`, { params }),
  getUpcoming: (params) => api.get('/payments/upcoming', { params }),
  getOverdue: (params) => api.get('/payments/overdue', { params }),
  getForeclosureAmount: (loanAccountId) =>
    api.get(`/payments/foreclosure/${loanAccountId}`),
  processForeclosure: (loanAccountId, data) =>
    api.post(`/payments/foreclosure/${loanAccountId}`, data),
  markOverdue: () => api.post('/payments/mark-overdue'),
};

// ==================
// Online Payment API (Customer Self-Service)
// ==================

export const onlinePaymentAPI = {
  // Get available payment methods
  getMethods: () => api.get('/online-payments/methods'),
  // Get pending EMIs for payment
  getPendingEMIs: () => api.get('/online-payments/pending-emis'),
  // Get payment history
  getHistory: (params) => api.get('/online-payments/history', { params }),
  // Get bank transfer details
  getBankDetails: () => api.get('/online-payments/bank-details'),
  // Razorpay
  createRazorpayOrder: (data) => api.post('/online-payments/razorpay/create-order', data),
  verifyRazorpayPayment: (data) => api.post('/online-payments/razorpay/verify', data),
  // UPI
  generateUPI: (data) => api.post('/online-payments/upi/generate', data),
  submitUPIPayment: (data) => api.post('/online-payments/upi/submit', data),
};

// ==================
// Mandate API (Auto-Debit / eNACH)
// ==================

export const mandateAPI = {
  // Public
  getBanks: () => api.get('/mandates/banks'),
  // Customer endpoints
  getMyMandates: () => api.get('/mandates/my-mandates'),
  create: (data) => api.post('/mandates', data),
  getById: (id) => api.get(`/mandates/${id}`),
  cancel: (id, data) => api.post(`/mandates/${id}/cancel`, data),
  // Staff endpoints
  getAll: (params) => api.get('/mandates', { params }),
  updateStatus: (id, data) => api.patch(`/mandates/${id}/status`, data),
  execute: (id, data) => api.post(`/mandates/${id}/execute`, data),
};

// ==================
// Document API (KYC)
// ==================

export const documentAPI = {
  // Customer endpoints
  uploadKYC: (data) => api.post('/documents/kyc', data),
  getMyKYC: () => api.get('/documents/kyc'),
  deleteKYC: (docId) => api.delete(`/documents/kyc/${docId}`),
  uploadProfilePhoto: (data) => api.post('/documents/profile-photo', data),
  // Staff endpoints
  getCustomerKYC: (customerId) => api.get(`/documents/kyc/${customerId}`),
  verifyKYC: (customerId, docId, data) =>
    api.patch(`/documents/kyc/${customerId}/${docId}/verify`, data),
};

// ==================
// Report API
// ==================

export const reportAPI = {
  getDashboard: () => api.get('/reports/dashboard'),
  getLoanPerformance: (params) => api.get('/reports/loan-performance', { params }),
  getCollections: (params) => api.get('/reports/collections', { params }),
  getOverdueReport: (params) => api.get('/reports/overdue', { params }),
  downloadLoanStatement: (loanAccountId) =>
    api.get(`/reports/loan-statement/${loanAccountId}`, { responseType: 'blob' }),
  downloadEMIReceipt: (emiId) =>
    api.get(`/reports/emi-receipt/${emiId}`, { responseType: 'blob' }),
  exportEMIHistory: (loanAccountId) =>
    api.get(`/reports/export/emis/${loanAccountId}`, { responseType: 'blob' }),
  getAuditLogs: (params) => api.get('/reports/audit-logs', { params }),
};

// ==================
// Utility Functions
// ==================

// Download file from blob response
export const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export default api;
