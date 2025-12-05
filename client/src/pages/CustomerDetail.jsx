// client/src/pages/CustomerDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { customerAPI } from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import CustomerNotes from '../components/CustomerNotes';
import toast from 'react-hot-toast';

const CustomerDetail = () => {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [loans, setLoans] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomerDetails();
  }, [id]);

  const fetchCustomerDetails = async () => {
    try {
      setLoading(true);
      const response = await customerAPI.getById(id);
      setCustomer(response.data.data.customer);
      setLoans(response.data.data.loans);
      setStats(response.data.data.stats);
    } catch (error) {
      toast.error('Failed to load customer details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Customer not found</p>
      </div>
    );
  }

  const getKycBadge = (status) => {
    const badges = {
      verified: 'badge-success',
      pending: 'badge-warning',
      submitted: 'badge-info',
      rejected: 'badge-danger',
    };
    return badges[status] || 'badge-gray';
  };

  const getLoanStatusBadge = (status) => {
    const badges = {
      active: 'badge-success',
      overdue: 'badge-danger',
      pending: 'badge-warning',
      closed: 'badge-gray',
      npa: 'badge-danger',
    };
    return badges[status] || 'badge-gray';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-primary-700 font-bold text-2xl">
              {customer.fullName?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.fullName}</h1>
            <p className="text-gray-500">{customer.phone} | {customer.email || 'No email'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/dashboard/loans/new?customerId=${customer._id}`} className="btn-primary">
            Create Loan
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-sm text-gray-500">Total Loans</p>
          <p className="text-2xl font-bold text-gray-900">{stats?.totalLoans || 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Active Loans</p>
          <p className="text-2xl font-bold text-green-600">{stats?.activeLoans || 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Total Borrowed</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.totalBorrowed)}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Credit Score</p>
          <p className="text-2xl font-bold text-primary-600">{stats?.creditScore || 50}/100</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Info */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold">Customer Information</h3>
          </div>
          <div className="card-body space-y-4">
            <div>
              <p className="text-sm text-gray-500">Full Name</p>
              <p className="font-medium">{customer.fullName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date of Birth</p>
              <p className="font-medium">{formatDate(customer.dob)} (Age: {customer.age})</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Gender</p>
              <p className="font-medium capitalize">{customer.gender}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium">{customer.phone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{customer.email || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Address</p>
              <p className="font-medium">{customer.fullAddress || '-'}</p>
            </div>
          </div>
        </div>

        {/* Employment & KYC */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold">Employment & KYC</h3>
          </div>
          <div className="card-body space-y-4">
            <div>
              <p className="text-sm text-gray-500">Employment Type</p>
              <p className="font-medium capitalize">{customer.employmentType?.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Employer</p>
              <p className="font-medium">{customer.employerName || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Monthly Income</p>
              <p className="font-medium">{formatCurrency(customer.monthlyIncome)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">KYC Status</p>
              <span className={getKycBadge(customer.kycStatus)}>
                {customer.kycStatus}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">Documents</p>
              {customer.kycDocs && customer.kycDocs.length > 0 ? (
                <ul className="space-y-2">
                  {customer.kycDocs.map((doc, index) => (
                    <li key={index} className="flex items-center justify-between text-sm">
                      <span className="capitalize">{doc.type.replace('_', ' ')}</span>
                      <span className={doc.verified ? 'text-green-600' : 'text-yellow-600'}>
                        {doc.verified ? '✓ Verified' : 'Pending'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No documents uploaded</p>
              )}
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold">Bank Details</h3>
          </div>
          <div className="card-body space-y-4">
            {customer.bankDetails?.bankName ? (
              <>
                <div>
                  <p className="text-sm text-gray-500">Bank Name</p>
                  <p className="font-medium">{customer.bankDetails.bankName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Account Number</p>
                  <p className="font-medium">{customer.bankDetails.accountNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">IFSC Code</p>
                  <p className="font-medium">{customer.bankDetails.ifscCode}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Account Type</p>
                  <p className="font-medium capitalize">{customer.bankDetails.accountType}</p>
                </div>
              </>
            ) : (
              <p className="text-gray-500">No bank details provided</p>
            )}
          </div>
        </div>
      </div>

      {/* Loans Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold">Loan History</h3>
        </div>
        {loans && loans.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Account No.</th>
                  <th>Product</th>
                  <th>Principal</th>
                  <th>EMI</th>
                  <th>Outstanding</th>
                  <th>Status</th>
                  <th>Next Due</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((loan) => (
                  <tr key={loan._id}>
                    <td>
                      <Link
                        to={`/dashboard/loans/${loan._id}`}
                        className="text-primary-600 hover:underline font-medium"
                      >
                        {loan.accountNumber}
                      </Link>
                    </td>
                    <td>{loan.productId?.name || '-'}</td>
                    <td>{formatCurrency(loan.principal)}</td>
                    <td>{formatCurrency(loan.emiAmount)}</td>
                    <td>{formatCurrency(loan.outstandingAmount)}</td>
                    <td>
                      <span className={getLoanStatusBadge(loan.status)}>
                        {loan.status}
                      </span>
                    </td>
                    <td>{loan.nextDueDate ? formatDate(loan.nextDueDate) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">No loans found</div>
        )}
      </div>

      {/* Communication Notes */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Communication Notes
          </h3>
        </div>
        <div className="card-body">
          <CustomerNotes customerId={id} />
        </div>
      </div>
    </div>
  );
};

export default CustomerDetail;
