// client/src/pages/LoanApplicationList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { loanApplicationAPI } from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// Default amount threshold - will be overridden by config from API
const DEFAULT_APPROVAL_LIMIT = 100000;

const LoanApplicationList = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [selectedApp, setSelectedApp] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [approvalLimit, setApprovalLimit] = useState(DEFAULT_APPROVAL_LIMIT);

  // Fetch approval config on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await loanApplicationAPI.getConfig();
        if (response.data?.data?.officerApprovalLimit) {
          setApprovalLimit(response.data.data.officerApprovalLimit);
        }
      } catch (error) {
        // Use default if config fetch fails
        console.log('Using default approval limit');
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [filter, pagination.page]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await loanApplicationAPI.getAll({
        status: filter === 'all' ? undefined : filter,
        page: pagination.page,
        limit: 20,
      });
      setApplications(response.data.data.applications);
      setPagination(response.data.data.pagination);
    } catch (error) {
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (app, action) => {
    setSelectedApp(app);
    setActionType(action);
    setRemarks('');
    setRejectionReason('');
    setShowModal(true);
  };

  const submitAction = async () => {
    if (actionType === 'reject' && !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      setProcessing(true);
      await loanApplicationAPI.review(selectedApp._id, {
        action: actionType,
        remarks: remarks.trim(),
        rejectionReason: rejectionReason.trim(),
      });

      toast.success(
        actionType === 'approve'
          ? 'Application approved! Loan account created.'
          : actionType === 'reject'
          ? 'Application rejected'
          : actionType === 'recommend'
          ? 'Application recommended for admin approval'
          : 'Application marked as under review'
      );

      setShowModal(false);
      fetchApplications();
    } catch (error) {
      const message = error.response?.data?.message || 'Action failed';
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending' },
      under_review: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Under Review' },
      recommended: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Recommended' },
      approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Approved' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
      converted: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Loan Created' },
    };
    return configs[status] || configs.pending;
  };

  const filterOptions = [
    { id: 'pending', label: 'Pending' },
    { id: 'under_review', label: 'Under Review' },
    { id: 'recommended', label: 'Recommended' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'all', label: 'All' },
  ];

  if (loading && applications.length === 0) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-gray-200 rounded-2xl" />
        <div className="flex gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 w-28 bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Loan Applications</h1>
            <p className="text-gray-500">Review and process customer loan applications</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{pagination.total} applications</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => {
              setFilter(option.id);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              filter === option.id
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {applications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Applications</h3>
            <p className="text-gray-500">No {filter !== 'all' ? filter.replace('_', ' ') : ''} applications found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Application
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {applications.map((app) => {
                  const statusConfig = getStatusConfig(app.status);
                  return (
                    <tr key={app._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">{app.applicationNumber}</p>
                        <p className="text-sm text-gray-500">{app.requestedTenure} months</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{app.customerId?.fullName}</p>
                        <p className="text-sm text-gray-500">{app.customerId?.phone}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          app.customerId?.kycStatus === 'verified'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          KYC: {app.customerId?.kycStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{app.productId?.name}</p>
                        <p className="text-sm text-gray-500">{app.productId?.interestRate}% p.a.</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900">{formatCurrency(app.requestedAmount)}</p>
                        <p className="text-sm text-gray-500">EMI: {formatCurrency(app.estimatedEMI)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{formatDate(app.createdAt)}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Pending or Under Review - Show review actions */}
                          {(app.status === 'pending' || app.status === 'under_review') && (
                            <>
                              {app.status === 'pending' && (
                                <button
                                  onClick={() => handleAction(app, 'under_review')}
                                  className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  Review
                                </button>
                              )}
                              {/* High-value loan + Officer = Recommend button */}
                              {!isAdmin && app.requestedAmount >= approvalLimit ? (
                                <button
                                  onClick={() => handleAction(app, 'recommend')}
                                  className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                                >
                                  Recommend
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleAction(app, 'approve')}
                                  className="px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                                >
                                  Approve
                                </button>
                              )}
                              <button
                                onClick={() => handleAction(app, 'reject')}
                                className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {/* Recommended status - Only admin can approve */}
                          {app.status === 'recommended' && isAdmin && (
                            <>
                              <button
                                onClick={() => handleAction(app, 'approve')}
                                className="px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleAction(app, 'reject')}
                                className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {/* Recommended status - Officer sees waiting message */}
                          {app.status === 'recommended' && !isAdmin && (
                            <span className="text-sm text-indigo-600 font-medium">
                              Awaiting Admin
                            </span>
                          )}
                          {app.status === 'approved' && app.loanAccountId && (
                            <Link
                              to={`/dashboard/loans/${app.loanAccountId}`}
                              className="px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors flex items-center gap-1"
                            >
                              View Loan
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.pages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Modal */}
      {showModal && selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-scale-in max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-900">
                {actionType === 'approve' && 'Approve Application'}
                {actionType === 'reject' && 'Reject Application'}
                {actionType === 'recommend' && 'Recommend for Admin Approval'}
                {actionType === 'under_review' && 'Mark as Under Review'}
              </h2>
              <p className="text-gray-500 mt-1">Application: {selectedApp.applicationNumber}</p>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-grow">
              {/* Application Summary */}
              <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer</span>
                  <span className="font-medium">{selectedApp.customerId?.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Product</span>
                  <span className="font-medium">{selectedApp.productId?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-bold">{formatCurrency(selectedApp.requestedAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tenure</span>
                  <span className="font-medium">{selectedApp.requestedTenure} months</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Monthly EMI</span>
                  <span className="font-medium">{formatCurrency(selectedApp.estimatedEMI)}</span>
                </div>
              </div>

              {/* Purpose */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Purpose</p>
                <p className="text-gray-600 bg-gray-50 p-3 rounded-xl">{selectedApp.purpose}</p>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks (Optional)
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                  placeholder="Add any remarks..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all resize-none"
                />
              </div>

              {/* Rejection Reason */}
              {actionType === 'reject' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    placeholder="Please provide a reason for rejection..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition-all resize-none"
                  />
                </div>
              )}

              {/* Approve Warning */}
              {actionType === 'approve' && (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-emerald-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-emerald-800">Loan Account will be created</p>
                      <p className="text-sm text-emerald-700 mt-1">
                        After approval, a loan account will be created with status "Approved".
                        You'll need to <strong>disburse</strong> the loan separately to transfer funds.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Recommend Info */}
              {actionType === 'recommend' && (
                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-indigo-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-indigo-800">High-Value Loan - Admin Approval Required</p>
                      <p className="text-sm text-indigo-700 mt-1">
                        Loans of <strong>₹1,00,000 or above</strong> require admin approval.
                        Your recommendation will be sent to the admin for final approval.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitAction}
                disabled={processing}
                className={`px-6 py-2 rounded-xl font-semibold text-white transition-all flex items-center gap-2 ${
                  actionType === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : actionType === 'reject'
                    ? 'bg-red-600 hover:bg-red-700'
                    : actionType === 'recommend'
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                } disabled:opacity-50`}
              >
                {processing ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    {actionType === 'approve' && 'Approve & Create Loan'}
                    {actionType === 'reject' && 'Reject Application'}
                    {actionType === 'recommend' && 'Recommend to Admin'}
                    {actionType === 'under_review' && 'Mark as Under Review'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanApplicationList;
