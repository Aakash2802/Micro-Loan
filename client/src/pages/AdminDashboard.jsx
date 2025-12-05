// client/src/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reportAPI } from '../services/api';
import CardStat from '../components/CardStat';
import { DashboardSkeleton } from '../components/Skeleton';
import { ErrorEmpty } from '../components/EmptyState';
import { formatCurrency, formatCompactCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [collectionView, setCollectionView] = useState('monthly');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await reportAPI.getDashboard();
      setData(response.data.data);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="py-20">
        <ErrorEmpty action={fetchDashboardData} />
      </div>
    );
  }

  const { summary, emis, customers, applications, collectionTrend, weeklyTrend, recentLoans } = data || {};

  const statusData = [
    { name: 'Active', value: summary?.activeLoans || 0, color: '#10B981' },
    { name: 'Overdue', value: summary?.overdueLoans || 0, color: '#F59E0B' },
    { name: 'NPA', value: summary?.npaLoans || 0, color: '#EF4444' },
    { name: 'Closed', value: summary?.closedLoans || 0, color: '#6B7280' },
  ].filter((item) => item.value > 0);

  const totalLoansForPie = statusData.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm px-4 py-3 rounded-xl shadow-xl border border-gray-100">
          <p className="text-sm font-semibold text-gray-900">{label}</p>
          <p className="text-lg font-bold text-primary-600">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="animate-fade-in-up">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-8 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full" />
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          </div>
          <p className="text-gray-500 ml-5">Welcome back! Here's what's happening with your loans today.</p>
        </div>
        <div className="flex gap-3 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <button className="btn-secondary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          <Link to="/dashboard/loans/new" className="btn-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Loan
          </Link>
        </div>
      </div>

      {/* Pending Actions Alert */}
      {(applications?.pendingRecommendations > 0 || applications?.pendingReview > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
          {applications?.pendingRecommendations > 0 && (
            <Link
              to="/dashboard/applications?status=recommended"
              className="flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] group"
            >
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-white/80 text-sm">Pending Approvals</p>
                <p className="text-2xl font-bold">{applications.pendingRecommendations} Applications</p>
                <p className="text-white/70 text-xs mt-1">Recommended by officers - awaiting your approval</p>
              </div>
              <svg className="w-5 h-5 text-white/60 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
          {applications?.pendingReview > 0 && (
            <Link
              to="/dashboard/applications?status=pending"
              className="flex items-center gap-4 p-4 bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] group"
            >
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-white/80 text-sm">Pending Review</p>
                <p className="text-2xl font-bold">{applications.pendingReview} Applications</p>
                <p className="text-white/70 text-xs mt-1">New applications awaiting review</p>
              </div>
              <svg className="w-5 h-5 text-white/60 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <CardStat
          title="Total Disbursed"
          value={formatCompactCurrency(summary?.totalDisbursed)}
          subtitle={`${summary?.totalLoans || 0} loans`}
          color="primary"
          delay={0}
          trend="up"
          trendValue="+12.5%"
          to="/dashboard/loans"
          icon={
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <CardStat
          title="Amount Collected"
          value={formatCompactCurrency(summary?.totalCollected)}
          subtitle={`${emis?.paid || 0} EMIs paid`}
          color="success"
          delay={100}
          trend="up"
          trendValue="+8.2%"
          to="/dashboard/loans"
          icon={
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <CardStat
          title="Outstanding"
          value={formatCompactCurrency(summary?.totalOutstanding)}
          subtitle={`${summary?.activeLoans || 0} active loans`}
          color="warning"
          delay={200}
          to="/dashboard/loans?status=active"
          icon={
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <CardStat
          title="Overdue"
          value={formatCompactCurrency(summary?.overdueAmount)}
          subtitle={`${emis?.overdue || 0} overdue EMIs`}
          color="danger"
          delay={300}
          trend={emis?.overdue > 0 ? 'down' : 'neutral'}
          trendValue={emis?.overdue > 0 ? `${emis?.overdue} pending` : 'On track'}
          to="/dashboard/loans?status=overdue"
          icon={
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Collection Trend Chart */}
        <div className="lg:col-span-2 card overflow-hidden animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Collection Trend</h3>
              <p className="text-sm text-gray-500">{collectionView === 'monthly' ? 'Monthly' : 'Weekly'} collection performance</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCollectionView('monthly')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  collectionView === 'monthly'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setCollectionView('weekly')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  collectionView === 'weekly'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                Weekly
              </button>
            </div>
          </div>
          <div className="p-6">
            {((collectionView === 'monthly' && collectionTrend?.length > 0) ||
              (collectionView === 'weekly' && weeklyTrend?.length > 0)) ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={collectionView === 'monthly' ? collectionTrend : weeklyTrend}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis
                    dataKey={collectionView === 'monthly' ? 'month' : 'week'}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                  />
                  <YAxis
                    tickFormatter={(value) => formatCompactCurrency(value)}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#4F46E5"
                    strokeWidth={3}
                    fill="url(#colorAmount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-72 flex flex-col items-center justify-center text-gray-400">
                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="font-medium">No collection data yet</p>
                <p className="text-sm">Start disbursing loans to see trends</p>
              </div>
            )}
          </div>
        </div>

        {/* Loan Status Distribution */}
        <div className="card overflow-hidden animate-fade-in-up" style={{ animationDelay: '500ms' }}>
          <div className="px-6 py-5 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">Loan Status</h3>
            <p className="text-sm text-gray-500">Distribution by status</p>
          </div>
          <div className="p-6">
            {statusData.length > 0 ? (
              <div className="flex flex-col items-center">
                <div className="relative">
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-gray-900">{totalLoansForPie}</span>
                    <span className="text-xs text-gray-500">Total Loans</span>
                  </div>
                </div>
                {/* Legend */}
                <div className="w-full mt-6 space-y-3">
                  {statusData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between group cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full transition-transform group-hover:scale-125"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">{item.value}</span>
                        <span className="text-xs text-gray-400">
                          ({Math.round((item.value / totalLoansForPie) * 100)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  </svg>
                </div>
                <p className="font-medium">No loans yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats & Recent Loans */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Stats */}
        <div className="card overflow-hidden animate-fade-in-up" style={{ animationDelay: '600ms' }}>
          <div className="px-6 py-5 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">Quick Stats</h3>
            <p className="text-sm text-gray-500">Key performance indicators</p>
          </div>
          <div className="p-6 space-y-5">
            {[
              { label: 'Total Customers', value: customers?.total || 0, icon: '👥', color: 'bg-blue-100' },
              { label: 'Verified KYC', value: customers?.verifiedKYC || 0, icon: '✅', color: 'bg-emerald-100' },
              { label: 'Pending KYC', value: customers?.pendingKYC || 0, icon: '⏳', color: 'bg-amber-100' },
              { label: 'NPA Rate', value: `${summary?.npaPercentage || 0}%`, icon: '📉', color: 'bg-red-100' },
              { label: 'Total Penalties', value: formatCurrency(emis?.totalPenalty), icon: '💰', color: 'bg-purple-100' },
            ].map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center text-lg transition-transform group-hover:scale-110`}>
                    {item.icon}
                  </div>
                  <span className="text-gray-600 font-medium">{item.label}</span>
                </div>
                <span className="font-bold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Loans */}
        <div className="lg:col-span-2 card overflow-hidden animate-fade-in-up" style={{ animationDelay: '700ms' }}>
          <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Recent Loans</h3>
              <p className="text-sm text-gray-500">Latest loan applications</p>
            </div>
            <Link
              to="/dashboard/customers"
              className="text-primary-600 text-sm font-semibold hover:text-primary-700 flex items-center gap-1 transition-colors"
            >
              View all
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentLoans && recentLoans.length > 0 ? (
                  recentLoans.map((loan, index) => (
                    <tr
                      key={loan._id}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${800 + index * 50}ms` }}
                    >
                      <td>
                        <Link
                          to={`/dashboard/loans/${loan._id}`}
                          className="text-primary-600 hover:text-primary-700 font-semibold transition-colors"
                        >
                          {loan.accountNumber}
                        </Link>
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold text-xs">
                            {loan.customerId?.fullName?.charAt(0) || '?'}
                          </div>
                          <span className="font-medium text-gray-900">{loan.customerId?.fullName || '-'}</span>
                        </div>
                      </td>
                      <td className="font-semibold">{formatCurrency(loan.principal)}</td>
                      <td>
                        <span
                          className={`badge ${
                            loan.status === 'active'
                              ? 'badge-success'
                              : loan.status === 'overdue'
                              ? 'badge-danger'
                              : loan.status === 'pending'
                              ? 'badge-warning'
                              : loan.status === 'approved'
                              ? 'badge-info'
                              : 'badge-gray'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            loan.status === 'active' ? 'bg-emerald-500' :
                            loan.status === 'overdue' ? 'bg-red-500' :
                            loan.status === 'pending' ? 'bg-amber-500' :
                            loan.status === 'approved' ? 'bg-blue-500' : 'bg-gray-500'
                          }`} />
                          {loan.status}
                        </span>
                      </td>
                      <td className="text-gray-500">{formatDate(loan.createdAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>
                      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <p className="font-medium">No loans yet</p>
                        <p className="text-sm">Create your first loan to see it here</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
