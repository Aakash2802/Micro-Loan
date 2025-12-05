// client/src/pages/customer/LoanDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { loanAccountAPI, reportAPI, downloadFile } from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate, formatDueDate } from '../../utils/formatDate';
import toast from 'react-hot-toast';

const CustomerLoanDetail = () => {
  const { id } = useParams();
  const [loan, setLoan] = useState(null);
  const [emis, setEmis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('schedule');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchLoanDetails();
  }, [id]);

  const fetchLoanDetails = async () => {
    try {
      setLoading(true);
      const response = await loanAccountAPI.getById(id);
      setLoan(response.data.data.loan);
      setEmis(response.data.data.emis);
    } catch (error) {
      toast.error('Failed to load loan details');
    } finally {
      setLoading(false);
    }
  };

  const downloadStatement = async () => {
    try {
      setDownloading(true);
      const response = await reportAPI.downloadLoanStatement(id);
      downloadFile(response.data, `LoanStatement_${loan.accountNumber}.pdf`);
      toast.success('Statement downloaded successfully');
    } catch (error) {
      toast.error('Failed to download statement');
    } finally {
      setDownloading(false);
    }
  };

  const downloadEMISchedule = async () => {
    try {
      setDownloading(true);
      const response = await reportAPI.exportEMIHistory(id);
      downloadFile(response.data, `EMISchedule_${loan.accountNumber}.pdf`);
      toast.success('EMI schedule downloaded successfully');
    } catch (error) {
      toast.error('Failed to download EMI schedule');
    } finally {
      setDownloading(false);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending' },
      approved: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Approved' },
      active: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Active' },
      overdue: { bg: 'bg-red-100', text: 'text-red-700', label: 'Overdue' },
      closed: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Closed' },
    };
    return configs[status] || configs.pending;
  };

  const getEmiStatusConfig = (status) => {
    const configs = {
      paid: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: '✓' },
      pending: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '○' },
      overdue: { bg: 'bg-red-100', text: 'text-red-700', icon: '!' },
      partial: { bg: 'bg-amber-100', text: 'text-amber-700', icon: '◐' },
    };
    return configs[status] || configs.pending;
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-40 bg-gray-200 rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-2xl" />
          ))}
        </div>
        <div className="h-96 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 2a10 10 0 110 20 10 10 0 010-20z" />
          </svg>
        </div>
        <p className="text-gray-500">Loan not found</p>
        <Link to="/dashboard/customer" className="text-primary-600 hover:underline mt-2 inline-block">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  const statusConfig = getStatusConfig(loan.status);
  const nextDueInfo = loan.nextDueDate ? formatDueDate(loan.nextDueDate) : null;
  const paidEmis = emis.filter(e => e.status === 'paid').length;
  const overdueEmis = emis.filter(e => e.status === 'overdue').length;
  const progressPercent = (paidEmis / loan.totalEMIs) * 100;

  // Calculate totals
  const totalPrincipalPaid = emis.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.principalComponent, 0);
  const totalInterestPaid = emis.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.interestComponent, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button & Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/dashboard/customer"
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{loan.accountNumber}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusConfig.bg} ${statusConfig.text}`}>
              {statusConfig.label}
            </span>
          </div>
          <p className="text-gray-500">{loan.productId?.name}</p>
        </div>
      </div>

      {/* Hero Card - Next EMI Due */}
      {loan.status === 'active' && loan.nextDueDate && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-purple-700 p-6 text-white shadow-2xl">
          <div className="absolute -right-16 -top-16 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -left-8 -bottom-16 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />

          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-primary-100 text-sm mb-1">Next EMI Due</p>
              <p className="text-3xl font-bold">{formatCurrency(loan.nextEmiAmount || loan.emiAmount)}</p>
              <p className={`mt-1 ${nextDueInfo?.isOverdue ? 'text-red-300' : 'text-primary-100'}`}>
                {nextDueInfo?.isOverdue ? `Overdue by ${Math.abs(nextDueInfo.daysLeft)} days` : `Due on ${formatDate(loan.nextDueDate)}`}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={downloadStatement}
                disabled={downloading}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-medium transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Statement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">Loan Amount</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(loan.principal)}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">Monthly EMI</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(loan.emiAmount)}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">Outstanding</p>
          </div>
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(loan.outstandingAmount)}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">EMIs Paid</p>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{paidEmis} / {loan.totalEMIs}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Repayment Progress</h3>
          <span className="text-primary-600 font-bold">{progressPercent.toFixed(1)}%</span>
        </div>
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-sm">
          <span className="text-gray-500">Paid: {formatCurrency(loan.totalPaid || 0)}</span>
          <span className="text-gray-500">Remaining: {formatCurrency(loan.outstandingAmount)}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-1">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2 font-medium rounded-t-xl transition-all ${
            activeTab === 'schedule'
              ? 'bg-primary-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          EMI Schedule
        </button>
        <button
          onClick={() => setActiveTab('details')}
          className={`px-4 py-2 font-medium rounded-t-xl transition-all ${
            activeTab === 'details'
              ? 'bg-primary-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Loan Details
        </button>
        <button
          onClick={() => setActiveTab('breakdown')}
          className={`px-4 py-2 font-medium rounded-t-xl transition-all ${
            activeTab === 'breakdown'
              ? 'bg-primary-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Interest Breakdown
        </button>
      </div>

      {/* EMI Schedule Tab */}
      {activeTab === 'schedule' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">EMI Payment Schedule</h3>
            <button
              onClick={downloadEMISchedule}
              disabled={downloading}
              className="px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download PDF
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">EMI #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Due Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">EMI Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Principal</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Interest</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Balance</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {emis.map((emi) => {
                  const emiStatus = getEmiStatusConfig(emi.status);
                  const dueInfo = formatDueDate(emi.dueDate);
                  return (
                    <tr key={emi._id || emi.sequence} className={`${emi.status === 'paid' ? 'bg-emerald-50/30' : emi.status === 'overdue' ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-gray-900">#{emi.sequence}</span>
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const date = new Date(emi.dueDate);
                          const day = date.getDate();
                          const month = date.toLocaleDateString('en-US', { month: 'short' });
                          const year = date.getFullYear();
                          const statusColors = {
                            paid: 'bg-emerald-50 border-emerald-200',
                            pending: 'bg-blue-50 border-blue-200',
                            overdue: 'bg-red-50 border-red-200',
                            partial: 'bg-amber-50 border-amber-200'
                          };
                          const textColors = {
                            paid: 'text-emerald-600',
                            pending: 'text-blue-600',
                            overdue: 'text-red-600',
                            partial: 'text-amber-600'
                          };
                          return (
                            <div className="flex items-center gap-3">
                              <div className={`text-center px-3 py-2 rounded-xl border ${statusColors[emi.status] || statusColors.pending}`}>
                                <p className={`text-xs font-semibold uppercase ${textColors[emi.status] || textColors.pending}`}>{month}</p>
                                <p className={`text-xl font-bold ${emi.status === 'overdue' ? 'text-red-700' : 'text-gray-900'}`}>{day}</p>
                                <p className="text-xs text-gray-500">{year}</p>
                              </div>
                              {emi.status === 'overdue' && (
                                <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-medium rounded-lg">
                                  {Math.abs(dueInfo.daysLeft)}d overdue
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {formatCurrency(emi.amount)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {formatCurrency(emi.principalComponent)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {formatCurrency(emi.interestComponent)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {formatCurrency(emi.closingBalance)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${emiStatus.bg} ${emiStatus.text}`}>
                          <span>{emiStatus.icon}</span>
                          {emi.status.charAt(0).toUpperCase() + emi.status.slice(1)}
                        </span>
                        {emi.paidDate && (
                          <p className="text-xs text-gray-500 mt-1">Paid: {formatDate(emi.paidDate)}</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Loan Details Tab */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Loan Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Account Number</span>
                <span className="font-medium text-gray-900">{loan.accountNumber}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Product</span>
                <span className="font-medium text-gray-900">{loan.productId?.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Principal Amount</span>
                <span className="font-medium text-gray-900">{formatCurrency(loan.principal)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Interest Rate</span>
                <span className="font-medium text-primary-600">{loan.interestRate}% p.a.</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Interest Type</span>
                <span className="font-medium text-gray-900 capitalize">{loan.interestType}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Tenure</span>
                <span className="font-medium text-gray-900">{loan.tenureMonths} months</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Start Date</span>
                <span className="font-medium text-gray-900">{formatDate(loan.startDate)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Processing Fee</span>
                <span className="font-medium text-gray-900">{formatCurrency(loan.processingFee)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Payment Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Total Payable</span>
                <span className="font-bold text-gray-900">{formatCurrency(loan.totalPayable)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Total Interest</span>
                <span className="font-medium text-gray-900">{formatCurrency(loan.totalInterest)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Total Paid</span>
                <span className="font-medium text-emerald-600">{formatCurrency(loan.totalPaid || 0)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Outstanding</span>
                <span className="font-medium text-amber-600">{formatCurrency(loan.outstandingAmount)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">EMIs Paid</span>
                <span className="font-medium text-gray-900">{paidEmis} of {loan.totalEMIs}</span>
              </div>
              {overdueEmis > 0 && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Overdue EMIs</span>
                  <span className="font-medium text-red-600">{overdueEmis}</span>
                </div>
              )}
              {loan.totalPenalty > 0 && (
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Total Penalty</span>
                  <span className="font-medium text-red-600">{formatCurrency(loan.totalPenalty)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Interest Breakdown Tab */}
      {activeTab === 'breakdown' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-6">Principal vs Interest Breakdown</h3>

          {/* Visual Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Pie Chart Visual */}
            <div className="flex flex-col items-center">
              <div className="relative w-48 h-48">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="24"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="24"
                    strokeDasharray={`${(loan.principal / loan.totalPayable) * 502} 502`}
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="24"
                    strokeDasharray={`${(loan.totalInterest / loan.totalPayable) * 502} 502`}
                    strokeDashoffset={`-${(loan.principal / loan.totalPayable) * 502}`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(loan.totalPayable)}</p>
                </div>
              </div>
              <div className="flex gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-500" />
                  <span className="text-sm text-gray-600">Principal</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-sm text-gray-600">Interest</span>
                </div>
              </div>
            </div>

            {/* Breakdown Numbers */}
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-indigo-600">Principal Amount</p>
                    <p className="text-2xl font-bold text-indigo-700">{formatCurrency(loan.principal)}</p>
                  </div>
                  <span className="text-2xl font-bold text-indigo-400">
                    {((loan.principal / loan.totalPayable) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-amber-600">Total Interest</p>
                    <p className="text-2xl font-bold text-amber-700">{formatCurrency(loan.totalInterest)}</p>
                  </div>
                  <span className="text-2xl font-bold text-amber-400">
                    {((loan.totalInterest / loan.totalPayable) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">Total Payable</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(loan.totalPayable)}</p>
                  </div>
                  <span className="text-2xl font-bold text-gray-400">100%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Breakdown */}
          <h4 className="font-medium text-gray-900 mb-4">Monthly Breakdown</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">EMI</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Principal</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Interest</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">P:I Ratio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {emis.slice(0, 12).map((emi) => {
                  const principalPercent = (emi.principalComponent / emi.amount) * 100;
                  return (
                    <tr key={emi.sequence}>
                      <td className="px-4 py-2 font-medium">#{emi.sequence}</td>
                      <td className="px-4 py-2 text-right text-indigo-600">{formatCurrency(emi.principalComponent)}</td>
                      <td className="px-4 py-2 text-right text-amber-600">{formatCurrency(emi.interestComponent)}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500"
                              style={{ width: `${principalPercent}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-12">{principalPercent.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {emis.length > 12 && (
              <p className="text-center text-sm text-gray-500 py-3">
                Showing first 12 of {emis.length} EMIs
              </p>
            )}
          </div>
        </div>
      )}

      {/* Download Buttons */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Download Documents</h3>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={downloadStatement}
            disabled={downloading}
            className="flex items-center gap-3 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-all disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Loan Statement (PDF)
          </button>
          <button
            onClick={downloadEMISchedule}
            disabled={downloading}
            className="flex items-center gap-3 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            EMI Schedule (PDF)
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerLoanDetail;
