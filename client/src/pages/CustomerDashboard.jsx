// client/src/pages/CustomerDashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { loanAccountAPI, customerAPI, reportAPI, downloadFile } from '../services/api';
import { useAuth } from '../context/AuthContext';
import CardStat from '../components/CardStat';
import { DashboardSkeleton } from '../components/Skeleton';
import { NoLoansEmpty } from '../components/EmptyState';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate, formatDueDate } from '../utils/formatDate';
import toast from 'react-hot-toast';

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loans, setLoans] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [profileRes, loansRes] = await Promise.all([
        customerAPI.getMyProfile(),
        loanAccountAPI.getMyLoans(),
      ]);
      setProfile(profileRes.data.data.customer);
      setLoans(loansRes.data.data.loans);
      setSummary(loansRes.data.data.summary);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const downloadStatement = async (loanId, accountNumber) => {
    try {
      const response = await reportAPI.downloadLoanStatement(loanId);
      downloadFile(response.data, `LoanStatement_${accountNumber}.pdf`);
      toast.success('Statement downloaded');
    } catch (error) {
      toast.error('Failed to download statement');
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
      approved: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
      active: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
      overdue: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
      closed: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' },
    };
    return configs[status] || configs.pending;
  };

  // Loading skeleton
  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-purple-700 p-8 text-white shadow-2xl shadow-primary-500/30 animate-scale-in">
        {/* Decorative elements */}
        <div className="absolute -right-20 -top-20 w-60 h-60 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-20 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-10 top-10 w-20 h-20 bg-white/10 rounded-full animate-float pointer-events-none" />
        <div className="absolute right-40 bottom-10 w-12 h-12 bg-white/10 rounded-full animate-float pointer-events-none" style={{ animationDelay: '1s' }} />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-xl">
              <span className="text-white font-bold text-3xl">
                {user?.name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-primary-100 text-sm mb-1">Welcome back,</p>
              <h1 className="text-3xl font-bold">{user?.name}!</h1>
              <p className="text-primary-100 mt-1">
                Manage your loans and track EMI payments
              </p>
            </div>
          </div>

          {/* Next EMI Card */}
          {summary?.nextEmiDate && (
            <div className="bg-white/15 backdrop-blur-xl rounded-2xl p-5 min-w-[240px] border border-white/20 animate-slide-in" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-sm text-primary-100">Next EMI Due</span>
              </div>
              <p className="text-2xl font-bold">{formatDate(summary.nextEmiDate)}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/20">
                <span className="text-primary-100 text-sm">Amount</span>
                <span className="text-xl font-bold">{formatCurrency(summary.nextEmiAmount)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CardStat
          title="Total Loans"
          value={summary?.totalLoans || 0}
          color="primary"
          delay={100}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
        <CardStat
          title="Active Loans"
          value={summary?.activeLoans || 0}
          color="success"
          delay={200}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <CardStat
          title="Total Borrowed"
          value={formatCurrency(summary?.totalBorrowed)}
          color="blue"
          delay={300}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <CardStat
          title="Outstanding"
          value={formatCurrency(summary?.totalOutstanding)}
          color="warning"
          delay={400}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Profile & Loans Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm animate-scale-in" style={{ animationDelay: '100ms' }}>
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">My Profile</h3>
          </div>
          <div className="p-6">
            {/* Profile Header */}
            <div className="text-center mb-6">
              <div className="relative inline-block">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-xl shadow-primary-500/20">
                  <span className="text-white font-bold text-3xl">
                    {profile?.fullName?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-3 border-white ${
                  profile?.kycStatus === 'verified' ? 'bg-emerald-500' : 'bg-amber-500'
                } flex items-center justify-center`}>
                  {profile?.kycStatus === 'verified' ? (
                    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
              <h4 className="mt-4 text-lg font-semibold text-gray-900">{profile?.fullName}</h4>
              <p className="text-gray-500">{profile?.phone}</p>
            </div>

            {/* Profile Details */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-500">Email</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{profile?.email || '-'}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-500">KYC Status</span>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                  profile?.kycStatus === 'verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {profile?.kycStatus}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-500">Credit Score</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-primary-500 rounded-full"
                      style={{ width: `${profile?.creditScore || 50}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-purple-600">{profile?.creditScore || 50}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loans List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm animate-scale-in" style={{ animationDelay: '200ms' }}>
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">My Loans</h3>
            <span className="px-2.5 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded-lg">
              {loans.length} loans
            </span>
          </div>
          {loans.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">No loans yet</h4>
              <p className="text-gray-500">You haven't taken any loans yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {loans.map((loan, index) => {
                const nextDueInfo = loan.nextDueDate ? formatDueDate(loan.nextDueDate) : null;
                const statusConfig = getStatusConfig(loan.status);
                const progress = Math.round((loan.paidEMIs / loan.totalEMIs) * 100);

                return (
                  <div
                    key={loan._id}
                    className="p-5 hover:bg-gray-50/80 transition-colors animate-fade-in group"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        {/* Loan Header */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-xl ${statusConfig.bg} flex items-center justify-center`}>
                            <svg className={`w-5 h-5 ${statusConfig.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div>
                            <Link
                              to={`/dashboard/customer/loans/${loan._id}`}
                              className="font-semibold text-gray-900 hover:text-primary-600 transition-colors"
                            >
                              {loan.accountNumber}
                            </Link>
                            <p className="text-sm text-gray-500">
                              {loan.productId?.name} - {formatCurrency(loan.principal)}
                            </p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${statusConfig.bg} ${statusConfig.text} ml-auto lg:ml-0`}>
                            {loan.status}
                          </span>
                        </div>

                        {/* Loan Stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-3">
                          <div className="p-2.5 bg-gray-50 rounded-xl">
                            <p className="text-xs text-gray-400 mb-0.5">Monthly EMI</p>
                            <p className="font-semibold text-gray-900">{formatCurrency(loan.emiAmount)}</p>
                          </div>
                          <div className="p-2.5 bg-amber-50 rounded-xl">
                            <p className="text-xs text-gray-400 mb-0.5">Outstanding</p>
                            <p className="font-semibold text-amber-600">{formatCurrency(loan.outstandingAmount)}</p>
                          </div>
                          {nextDueInfo && (
                            <div className={`p-2.5 rounded-xl ${nextDueInfo.className.includes('red') ? 'bg-red-50' : 'bg-emerald-50'}`}>
                              <p className="text-xs text-gray-400 mb-0.5">Next Due</p>
                              <p className={`font-semibold ${nextDueInfo.className.includes('red') ? 'text-red-600' : 'text-gray-900'}`}>
                                {formatDate(loan.nextDueDate)}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Progress Bar */}
                        <div>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-gray-500">{loan.paidEMIs} of {loan.totalEMIs} EMIs paid</span>
                            <span className="font-semibold text-primary-600">{progress}%</span>
                          </div>
                          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex lg:flex-col gap-2">
                        <Link
                          to={`/dashboard/customer/loans/${loan._id}`}
                          className="flex-1 lg:flex-none px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-sm font-medium rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
                        >
                          <span>View Details</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => downloadStatement(loan._id, loan.accountNumber)}
                          className="flex-1 lg:flex-none px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          <span>Statement</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Online Payment Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-8 text-white animate-scale-in" style={{ animationDelay: '300ms' }}>
        {/* Decorative elements */}
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-60 h-60 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start mb-2">
              <h3 className="text-xl font-bold">Online Payment</h3>
              <span className="px-2 py-0.5 bg-emerald-400/30 text-emerald-200 text-xs font-semibold rounded-md">
                Available Now
              </span>
            </div>
            <p className="text-purple-100">
              Pay your EMIs online via Razorpay integration. UPI, Cards, Net Banking supported.
            </p>
          </div>
          <Link
            to="/dashboard/customer/pay-emi"
            className="px-6 py-3 bg-white text-purple-700 font-semibold rounded-xl hover:bg-purple-50 transition-colors flex items-center gap-2 shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Pay Now
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
