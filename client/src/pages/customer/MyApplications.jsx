// client/src/pages/customer/MyApplications.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { loanApplicationAPI } from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import toast from 'react-hot-toast';

const MyApplications = () => {
  const [applications, setApplications] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await loanApplicationAPI.getMyApplications();
      setApplications(response.data.data.applications);
      setSummary(response.data.data.summary);
    } catch (error) {
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      pending: {
        bg: 'bg-amber-100',
        text: 'text-amber-700',
        icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
        label: 'Pending Review',
      },
      under_review: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
        label: 'Under Review',
      },
      recommended: {
        bg: 'bg-indigo-100',
        text: 'text-indigo-700',
        icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
        label: 'Awaiting Final Approval',
      },
      approved: {
        bg: 'bg-emerald-100',
        text: 'text-emerald-700',
        icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
        label: 'Approved',
      },
      rejected: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
        label: 'Rejected',
      },
      converted: {
        bg: 'bg-purple-100',
        text: 'text-purple-700',
        icon: 'M5 13l4 4L19 7',
        label: 'Loan Created',
      },
    };
    return configs[status] || configs.pending;
  };

  const filteredApplications = filter === 'all'
    ? applications
    : applications.filter(app => app.status === filter);

  const filterOptions = [
    { id: 'all', label: 'All', count: summary?.total || 0 },
    { id: 'pending', label: 'Pending', count: summary?.pending || 0 },
    { id: 'under_review', label: 'Under Review', count: summary?.underReview || 0 },
    { id: 'recommended', label: 'Recommended', count: summary?.recommended || 0 },
    { id: 'approved', label: 'Approved', count: summary?.approved || 0 },
    { id: 'rejected', label: 'Rejected', count: summary?.rejected || 0 },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-gray-200 rounded-3xl" />
        <div className="flex gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 w-28 bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 bg-gray-200 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-purple-700 p-8 text-white shadow-2xl shadow-primary-500/30">
        <div className="absolute -right-20 -top-20 w-60 h-60 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-20 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">My Applications</h1>
              <p className="text-primary-100 mt-1">Track your loan application status</p>
            </div>
          </div>
          <Link
            to="/dashboard/customer/loan-products"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary-700 rounded-xl font-semibold hover:bg-primary-50 transition-all shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Apply for New Loan
          </Link>
        </div>

        {/* Stats */}
        <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/20 backdrop-blur px-4 py-3 rounded-xl">
            <span className="text-primary-100 text-sm">Total Applications</span>
            <p className="font-bold text-2xl">{summary?.total || 0}</p>
          </div>
          <div className="bg-white/20 backdrop-blur px-4 py-3 rounded-xl">
            <span className="text-primary-100 text-sm">Pending</span>
            <p className="font-bold text-2xl">{(summary?.pending || 0) + (summary?.underReview || 0)}</p>
          </div>
          <div className="bg-white/20 backdrop-blur px-4 py-3 rounded-xl">
            <span className="text-primary-100 text-sm">Approved</span>
            <p className="font-bold text-2xl">{summary?.approved || 0}</p>
          </div>
          <div className="bg-white/20 backdrop-blur px-4 py-3 rounded-xl">
            <span className="text-primary-100 text-sm">Rejected</span>
            <p className="font-bold text-2xl">{summary?.rejected || 0}</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => setFilter(option.id)}
            className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
              filter === option.id
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {option.label}
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              filter === option.id ? 'bg-white/20' : 'bg-gray-100'
            }`}>
              {option.count}
            </span>
          </button>
        ))}
      </div>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Applications Found</h3>
          <p className="text-gray-500 mb-6">
            {filter === 'all'
              ? "You haven't submitted any loan applications yet."
              : `No ${filter.replace('_', ' ')} applications.`}
          </p>
          <Link
            to="/dashboard/customer/loan-products"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Apply for a Loan
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((app) => {
            const statusConfig = getStatusConfig(app.status);
            return (
              <div
                key={app._id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Application Info */}
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl ${statusConfig.bg} flex items-center justify-center flex-shrink-0`}>
                        <svg className={`w-6 h-6 ${statusConfig.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={statusConfig.icon} />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {app.productId?.name || 'Loan Application'}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                        <p className="text-gray-500 text-sm mt-1">
                          Application #{app.applicationNumber}
                        </p>
                        <p className="text-gray-400 text-sm">
                          Applied on {formatDate(app.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Amount & Action */}
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Requested Amount</p>
                        <p className="text-xl font-bold text-gray-900">{formatCurrency(app.requestedAmount)}</p>
                        <p className="text-sm text-gray-500">{app.requestedTenure} months</p>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Interest Rate</p>
                      <p className="font-semibold text-gray-900">{app.estimatedInterestRate}% p.a.</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Estimated EMI</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(app.estimatedEMI)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Purpose</p>
                      <p className="font-semibold text-gray-900 truncate">{app.purpose}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Last Updated</p>
                      <p className="font-semibold text-gray-900">{formatDate(app.updatedAt)}</p>
                    </div>
                  </div>

                  {/* Recommended - Awaiting Admin */}
                  {app.status === 'recommended' && (
                    <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-indigo-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-indigo-800">Application Recommended</p>
                          <p className="text-sm text-indigo-700 mt-1">
                            Your application has been reviewed and recommended by our officer. It's now awaiting final approval from the admin. You'll be notified once a decision is made.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rejection Reason */}
                  {app.status === 'rejected' && app.rejectionReason && (
                    <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-100">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-red-800">Reason for Rejection</p>
                          <p className="text-sm text-red-700 mt-1">{app.rejectionReason}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Approved - View Loan */}
                  {app.status === 'approved' && app.loanAccountId && (
                    <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-sm font-medium text-emerald-800">
                            Your loan has been approved and created!
                          </p>
                        </div>
                        <Link
                          to={`/dashboard/customer`}
                          className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                        >
                          View Loan
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyApplications;
