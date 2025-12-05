// client/src/pages/customer/AutoDebit.jsx
import { useState, useEffect } from 'react';
import { loanAccountAPI, mandateAPI } from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import toast from 'react-hot-toast';

const AutoDebit = () => {
  const [mandates, setMandates] = useState([]);
  const [loans, setLoans] = useState([]);
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [selectedMandate, setSelectedMandate] = useState(null);

  const [formData, setFormData] = useState({
    loanAccountId: '',
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
    accountType: 'savings',
    debitDay: 5,
    consent: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [mandatesRes, loansRes, banksRes] = await Promise.all([
        mandateAPI.getMyMandates(),
        loanAccountAPI.getMyLoans(),
        mandateAPI.getBanks(),
      ]);
      setMandates(mandatesRes.data.data.mandates || []);
      // Filter loans that can have mandate
      const eligibleLoans = (loansRes.data.data.loans || []).filter(
        (loan) => ['active', 'overdue', 'disbursed'].includes(loan.status)
      );
      setLoans(eligibleLoans);
      setBanks(banksRes.data.data.banks || []);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const validateIFSC = (ifsc) => {
    return /^[A-Z]{4}0[A-Z0-9]{6}$/i.test(ifsc);
  };

  const openSetupModal = () => {
    setFormData({
      loanAccountId: loans[0]?._id || '',
      accountHolderName: '',
      bankName: '',
      accountNumber: '',
      confirmAccountNumber: '',
      ifscCode: '',
      accountType: 'savings',
      debitDay: 5,
      consent: false,
    });
    setShowSetupModal(true);
  };

  const handleSetupMandate = async (e) => {
    e.preventDefault();

    // Validations
    if (formData.accountNumber !== formData.confirmAccountNumber) {
      toast.error('Account numbers do not match');
      return;
    }

    if (!validateIFSC(formData.ifscCode)) {
      toast.error('Invalid IFSC code format');
      return;
    }

    if (!formData.consent) {
      toast.error('Please provide consent for auto-debit');
      return;
    }

    try {
      setSetupLoading(true);
      await mandateAPI.create({
        ...formData,
        consent: formData.consent.toString(),
      });
      toast.success('Auto-debit registration initiated successfully');
      setShowSetupModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to setup auto-debit');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleCancelMandate = async (mandateId) => {
    if (!confirm('Are you sure you want to cancel this auto-debit mandate?')) {
      return;
    }

    try {
      await mandateAPI.cancel(mandateId, { reason: 'Cancelled by customer' });
      toast.success('Mandate cancelled successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel mandate');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge-warning',
      initiated: 'badge-info',
      approved: 'badge-info',
      active: 'badge-success',
      suspended: 'badge-danger',
      cancelled: 'badge-gray',
      expired: 'badge-gray',
      rejected: 'badge-danger',
    };
    return badges[status] || 'badge-gray';
  };

  const getStatusText = (status) => {
    const texts = {
      pending: 'Pending',
      initiated: 'Processing',
      approved: 'Approved',
      active: 'Active',
      suspended: 'Suspended',
      cancelled: 'Cancelled',
      expired: 'Expired',
      rejected: 'Rejected',
    };
    return texts[status] || status;
  };

  // Check which loans already have active mandates
  const loansWithMandate = mandates
    .filter((m) => ['pending', 'initiated', 'approved', 'active'].includes(m.status))
    .map((m) => m.loanAccountId?._id || m.loanAccountId);

  const availableLoans = loans.filter((loan) => !loansWithMandate.includes(loan._id));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auto-Debit Setup</h1>
          <p className="text-gray-500">Manage automatic EMI payments from your bank account</p>
        </div>
        {availableLoans.length > 0 && (
          <button onClick={openSetupModal} className="btn-primary">
            Setup Auto-Debit
          </button>
        )}
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <div className="text-blue-600 text-xl">ℹ️</div>
          <div>
            <h4 className="font-medium text-blue-900">What is eNACH Auto-Debit?</h4>
            <p className="text-sm text-blue-700 mt-1">
              eNACH (Electronic National Automated Clearing House) allows automatic deduction of your EMI
              from your bank account on the due date. Never miss a payment and maintain a good credit score!
            </p>
            <ul className="text-sm text-blue-700 mt-2 list-disc list-inside">
              <li>Automatic EMI deduction on due date</li>
              <li>No need to remember payment dates</li>
              <li>Avoid late payment penalties</li>
              <li>Cancel anytime</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Active Mandates */}
      {mandates.length > 0 ? (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold">Your Auto-Debit Mandates</h3>
          </div>
          <div className="divide-y">
            {mandates.map((mandate) => (
              <div key={mandate._id} className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900">
                        {mandate.loanAccountId?.accountNumber || 'Loan Account'}
                      </span>
                      <span className={getStatusBadge(mandate.status)}>
                        {getStatusText(mandate.status)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500">Bank</p>
                        <p className="font-medium">{mandate.bankName}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Account</p>
                        <p className="font-medium">{mandate.accountNumberMasked}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Max Amount</p>
                        <p className="font-medium">{formatCurrency(mandate.maxAmount)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Debit Day</p>
                        <p className="font-medium">{mandate.debitDay}th of month</p>
                      </div>
                    </div>
                    {mandate.status === 'active' && (
                      <div className="mt-3 flex items-center gap-4 text-sm">
                        <span className="text-green-600">
                          ✓ {mandate.totalDebits} successful debits
                        </span>
                        <span className="text-gray-500">
                          Valid until {formatDate(mandate.endDate)}
                        </span>
                      </div>
                    )}
                    {mandate.status === 'rejected' && mandate.rejectionReason && (
                      <p className="mt-2 text-sm text-red-600">
                        Rejection reason: {mandate.rejectionReason}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedMandate(mandate)}
                      className="btn-secondary text-sm"
                    >
                      View Details
                    </button>
                    {['pending', 'initiated', 'approved', 'active'].includes(mandate.status) && (
                      <button
                        onClick={() => handleCancelMandate(mandate._id)}
                        className="btn-danger text-sm"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card p-8 text-center">
          <div className="text-4xl mb-4">🏦</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Auto-Debit Setup</h3>
          <p className="text-gray-500 mb-4">
            You haven't set up auto-debit for any of your loans yet.
          </p>
          {availableLoans.length > 0 ? (
            <button onClick={openSetupModal} className="btn-primary">
              Setup Auto-Debit Now
            </button>
          ) : loans.length === 0 ? (
            <p className="text-sm text-gray-400">No active loans available</p>
          ) : (
            <p className="text-sm text-gray-400">All loans already have auto-debit setup</p>
          )}
        </div>
      )}

      {/* Setup Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg max-h-[90vh] flex flex-col animate-fade-in">
            <div className="card-header flex justify-between items-center flex-shrink-0">
              <h3 className="text-lg font-semibold">Setup Auto-Debit</h3>
              <button
                onClick={() => setShowSetupModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSetupMandate} className="card-body space-y-4 overflow-y-auto flex-1">
              {/* Loan Selection */}
              <div>
                <label className="label">Select Loan</label>
                <select
                  name="loanAccountId"
                  value={formData.loanAccountId}
                  onChange={handleInputChange}
                  className="input"
                  required
                >
                  {availableLoans.map((loan) => (
                    <option key={loan._id} value={loan._id}>
                      {loan.accountNumber} - EMI {formatCurrency(loan.emiAmount)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Holder Name */}
              <div>
                <label className="label">Account Holder Name</label>
                <input
                  type="text"
                  name="accountHolderName"
                  value={formData.accountHolderName}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="Name as per bank account"
                  required
                />
              </div>

              {/* Bank Selection */}
              <div>
                <label className="label">Bank Name</label>
                <select
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleInputChange}
                  className="input"
                  required
                >
                  <option value="">Select Bank</option>
                  {banks.map((bank) => (
                    <option key={bank.code} value={bank.name}>
                      {bank.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Number */}
              <div>
                <label className="label">Account Number</label>
                <input
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="Enter bank account number"
                  pattern="\d{9,18}"
                  required
                />
              </div>

              {/* Confirm Account Number */}
              <div>
                <label className="label">Confirm Account Number</label>
                <input
                  type="text"
                  name="confirmAccountNumber"
                  value={formData.confirmAccountNumber}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="Re-enter account number"
                  required
                />
                {formData.confirmAccountNumber &&
                  formData.accountNumber !== formData.confirmAccountNumber && (
                    <p className="text-red-500 text-sm mt-1">Account numbers do not match</p>
                  )}
              </div>

              {/* IFSC Code */}
              <div>
                <label className="label">IFSC Code</label>
                <input
                  type="text"
                  name="ifscCode"
                  value={formData.ifscCode}
                  onChange={handleInputChange}
                  className="input uppercase"
                  placeholder="e.g., HDFC0001234"
                  maxLength={11}
                  required
                />
                {formData.ifscCode && !validateIFSC(formData.ifscCode) && (
                  <p className="text-red-500 text-sm mt-1">Invalid IFSC format</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Account Type */}
                <div>
                  <label className="label">Account Type</label>
                  <select
                    name="accountType"
                    value={formData.accountType}
                    onChange={handleInputChange}
                    className="input"
                  >
                    <option value="savings">Savings</option>
                    <option value="current">Current</option>
                  </select>
                </div>

                {/* Debit Day */}
                <div>
                  <label className="label">Preferred Debit Day</label>
                  <select
                    name="debitDay"
                    value={formData.debitDay}
                    onChange={handleInputChange}
                    className="input"
                  >
                    {[1, 5, 10, 15, 20, 25].map((day) => (
                      <option key={day} value={day}>
                        {day}th of month
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Consent */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="consent"
                    checked={formData.consent}
                    onChange={handleInputChange}
                    className="w-5 h-5 mt-0.5 text-primary-600 rounded focus:ring-primary-500"
                    required
                  />
                  <span className="text-sm text-gray-700">
                    I authorize LoanSphere to debit my bank account for EMI payments on the
                    scheduled dates. I understand that sufficient balance must be maintained
                    in my account and that failed debits may attract additional charges.
                  </span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSetupModal(false)}
                  className="btn-secondary flex-1"
                  disabled={setupLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={setupLoading || !formData.consent}
                >
                  {setupLoading ? 'Setting up...' : 'Setup Auto-Debit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mandate Details Modal */}
      {selectedMandate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md animate-fade-in">
            <div className="card-header flex justify-between items-center">
              <h3 className="text-lg font-semibold">Mandate Details</h3>
              <button
                onClick={() => setSelectedMandate(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="card-body space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Status</span>
                <span className={getStatusBadge(selectedMandate.status)}>
                  {getStatusText(selectedMandate.status)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Loan Account</span>
                <span className="font-medium">
                  {selectedMandate.loanAccountId?.accountNumber}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Bank</span>
                <span className="font-medium">{selectedMandate.bankName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Account</span>
                <span className="font-medium">{selectedMandate.accountNumberMasked}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">IFSC</span>
                <span className="font-medium">{selectedMandate.ifscCode}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Max Amount</span>
                <span className="font-medium">{formatCurrency(selectedMandate.maxAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Debit Day</span>
                <span className="font-medium">{selectedMandate.debitDay}th</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Valid From</span>
                <span className="font-medium">{formatDate(selectedMandate.startDate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Valid Until</span>
                <span className="font-medium">{formatDate(selectedMandate.endDate)}</span>
              </div>
              {selectedMandate.umrn && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">UMRN</span>
                  <span className="font-medium text-xs">{selectedMandate.umrn}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Total Debits</span>
                <span className="font-medium">{selectedMandate.totalDebits}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Total Debited</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(selectedMandate.totalAmountDebited)}
                </span>
              </div>
              <div className="pt-4">
                <button
                  onClick={() => setSelectedMandate(null)}
                  className="btn-secondary w-full"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoDebit;
