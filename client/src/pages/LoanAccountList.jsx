// client/src/pages/LoanAccountList.jsx
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { loanAccountAPI } from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import { TableRowSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import toast from 'react-hot-toast';

const LoanAccountList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(searchParams.get('status') || 'all');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  useEffect(() => {
    // Update filter when URL params change
    const statusParam = searchParams.get('status');
    if (statusParam) {
      setFilter(statusParam);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchLoans();
  }, [filter, pagination.page, search]);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const response = await loanAccountAPI.getAll({
        status: filter === 'all' ? undefined : filter,
        page: pagination.page,
        limit: 20,
        search: search || undefined,
      });
      setLoans(response.data.data.loans);
      setPagination(response.data.data.pagination);
    } catch (error) {
      toast.error('Failed to load loans');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setPagination((prev) => ({ ...prev, page: 1 }));
    if (newFilter === 'all') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', newFilter);
    }
    setSearchParams(searchParams);
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge-warning',
      approved: 'badge-info',
      active: 'badge-success',
      overdue: 'badge-danger',
      npa: 'badge-danger',
      closed: 'badge-gray',
      rejected: 'badge-gray',
    };
    return badges[status] || 'badge-gray';
  };

  const getStatusDot = (status) => {
    const dots = {
      pending: 'bg-amber-500',
      approved: 'bg-blue-500',
      active: 'bg-emerald-500',
      overdue: 'bg-red-500',
      npa: 'bg-red-600',
      closed: 'bg-gray-500',
      rejected: 'bg-gray-400',
    };
    return dots[status] || 'bg-gray-500';
  };

  const filters = [
    { value: 'all', label: 'All Loans' },
    { value: 'active', label: 'Active' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'npa', label: 'NPA' },
    { value: 'approved', label: 'Approved' },
    { value: 'pending', label: 'Pending' },
    { value: 'closed', label: 'Closed' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-8 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full" />
            <h1 className="text-3xl font-bold text-gray-900">Loan Accounts</h1>
          </div>
          <p className="text-gray-500 ml-5">Manage and track all loan accounts</p>
        </div>
        <Link to="/dashboard/loans/new" className="btn-primary">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Loan
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="card p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Status Filters */}
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => handleFilterChange(f.value)}
                className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                  filter === f.value
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="lg:ml-auto relative">
            <input
              type="text"
              placeholder="Search by account number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10 w-full lg:w-64"
            />
            <svg
              className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
          <p className="text-sm text-gray-500">Total Loans</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">
            {loans.filter((l) => l.status === 'active').length}
          </p>
          <p className="text-sm text-gray-500">Active (this page)</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-red-600">
            {loans.filter((l) => l.status === 'overdue').length}
          </p>
          <p className="text-sm text-gray-500">Overdue (this page)</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">
            {loans.filter((l) => l.status === 'approved').length}
          </p>
          <p className="text-sm text-gray-500">Pending Disburse</p>
        </div>
      </div>

      {/* Loans Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Principal</th>
                  <th>Outstanding</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[...Array(8)].map((_, i) => (
                  <TableRowSkeleton key={i} columns={8} />
                ))}
              </tbody>
            </table>
          </div>
        ) : loans.length === 0 ? (
          <div className="py-16">
            <EmptyState
              type="loans"
              title="No loans found"
              description={filter === 'all' ? 'Create your first loan to get started' : `No ${filter} loans found`}
            />
            <div className="text-center -mt-4">
              <Link to="/dashboard/loans/new" className="btn-primary">
                Create Loan
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Principal</th>
                  <th>Outstanding</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loans.map((loan) => (
                  <tr key={loan._id} className="group">
                    <td>
                      <Link
                        to={`/dashboard/loans/${loan._id}`}
                        className="text-primary-600 hover:text-primary-700 font-semibold"
                      >
                        {loan.accountNumber}
                      </Link>
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold text-xs">
                          {loan.customerId?.fullName?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{loan.customerId?.fullName || '-'}</p>
                          <p className="text-xs text-gray-500">{loan.customerId?.phone || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-gray-700">{loan.productId?.name || '-'}</span>
                      {loan.productId?.code && (
                        <span className="ml-2 text-xs text-gray-400">({loan.productId.code})</span>
                      )}
                    </td>
                    <td className="font-semibold">{formatCurrency(loan.principal)}</td>
                    <td className="font-semibold text-amber-600">
                      {formatCurrency(loan.outstandingAmount)}
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(loan.status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(loan.status)}`} />
                        {loan.status}
                      </span>
                    </td>
                    <td className="text-gray-500">{formatDate(loan.createdAt)}</td>
                    <td>
                      <Link
                        to={`/dashboard/loans/${loan._id}`}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-primary-600 hover:text-primary-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(pagination.page - 1) * 20 + 1} to {Math.min(pagination.page * 20, pagination.total)} of{' '}
              {pagination.total} loans
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.pages}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoanAccountList;
