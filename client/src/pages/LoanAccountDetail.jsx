// client/src/pages/LoanAccountDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { loanAccountAPI, paymentAPI, reportAPI, downloadFile } from '../services/api';
import { useAuth } from '../context/AuthContext';
import EmiTable from '../components/EmiTable';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate, formatDueDate } from '../utils/formatDate';
import toast from 'react-hot-toast';

const LoanAccountDetail = () => {
  const { id } = useParams();
  const { isStaff } = useAuth();
  const [loan, setLoan] = useState(null);
  const [emis, setEmis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentModal, setPaymentModal] = useState({ open: false, emi: null });
  const [paymentData, setPaymentData] = useState({
    amount: '',
    mode: 'cash',
    referenceNumber: '',
  });

  // Restructuring state
  const [restructureModal, setRestructureModal] = useState(false);
  const [restructureData, setRestructureData] = useState({
    newTenure: '',
    newInterestRate: '',
    reason: '',
    startFromNext: true,
  });
  const [restructurePreview, setRestructurePreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [restructureLoading, setRestructureLoading] = useState(false);

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

  const handlePayEmi = (emi) => {
    setPaymentData({
      amount: (emi.amount + (emi.penaltyAmount || 0) - (emi.paidAmount || 0)).toString(),
      mode: 'cash',
      referenceNumber: '',
    });
    setPaymentModal({ open: true, emi });
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    try {
      await paymentAPI.record({
        emiId: paymentModal.emi._id,
        amount: parseFloat(paymentData.amount),
        mode: paymentData.mode,
        referenceNumber: paymentData.referenceNumber,
      });
      toast.success('Payment recorded successfully');
      setPaymentModal({ open: false, emi: null });
      fetchLoanDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record payment');
    }
  };

  const downloadStatement = async () => {
    try {
      const response = await reportAPI.downloadLoanStatement(id);
      downloadFile(response.data, `LoanStatement_${loan.accountNumber}.pdf`);
      toast.success('Statement downloaded');
    } catch (error) {
      toast.error('Failed to download statement');
    }
  };

  const approveLoan = async () => {
    try {
      await loanAccountAPI.approve(id, {});
      toast.success('Loan approved');
      fetchLoanDetails();
    } catch (error) {
      toast.error('Failed to approve loan');
    }
  };

  const disburseLoan = async () => {
    try {
      await loanAccountAPI.disburse(id, {
        amount: loan.disbursedAmount,
        mode: 'bank_transfer',
        referenceNumber: `DIS-${Date.now()}`,
      });
      toast.success('Loan disbursed');
      fetchLoanDetails();
    } catch (error) {
      toast.error('Failed to disburse loan');
    }
  };

  const openRestructureModal = () => {
    setRestructureData({
      newTenure: '',
      newInterestRate: '',
      reason: '',
      startFromNext: true,
    });
    setRestructurePreview(null);
    setRestructureModal(true);
  };

  const handlePreviewRestructure = async () => {
    if (!restructureData.newTenure && !restructureData.newInterestRate) {
      toast.error('Please specify new tenure or interest rate');
      return;
    }

    try {
      setPreviewLoading(true);
      const payload = {};
      if (restructureData.newTenure) payload.newTenure = parseInt(restructureData.newTenure);
      if (restructureData.newInterestRate) payload.newInterestRate = parseFloat(restructureData.newInterestRate);
      payload.startFromNext = restructureData.startFromNext;

      const response = await loanAccountAPI.previewRestructure(id, payload);
      setRestructurePreview(response.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to preview restructure');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleRestructure = async () => {
    if (!restructureData.reason || restructureData.reason.trim().length < 10) {
      toast.error('Please provide a reason (at least 10 characters)');
      return;
    }

    try {
      setRestructureLoading(true);
      const payload = {
        reason: restructureData.reason.trim(),
        startFromNext: restructureData.startFromNext,
      };
      if (restructureData.newTenure) payload.newTenure = parseInt(restructureData.newTenure);
      if (restructureData.newInterestRate) payload.newInterestRate = parseFloat(restructureData.newInterestRate);

      await loanAccountAPI.restructure(id, payload);
      toast.success('Loan restructured successfully');
      setRestructureModal(false);
      fetchLoanDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to restructure loan');
    } finally {
      setRestructureLoading(false);
    }
  };

  const canRestructure = loan && ['active', 'overdue', 'disbursed'].includes(loan.status);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loan not found</p>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge-warning',
      approved: 'badge-info',
      disbursed: 'badge-info',
      active: 'badge-success',
      overdue: 'badge-danger',
      npa: 'badge-danger',
      closed: 'badge-gray',
      foreclosed: 'badge-gray',
    };
    return badges[status] || 'badge-gray';
  };

  const getRiskBadge = (category) => {
    const badges = {
      low: 'badge-success',
      medium: 'badge-warning',
      high: 'badge-danger',
      critical: 'badge-danger',
    };
    return badges[category] || 'badge-gray';
  };

  const nextDueInfo = loan.nextDueDate ? formatDueDate(loan.nextDueDate) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{loan.accountNumber}</h1>
            <span className={getStatusBadge(loan.status)}>{loan.status}</span>
          </div>
          <p className="text-gray-500">
            {loan.customerId?.fullName} | {loan.productId?.name}
          </p>
        </div>
        <div className="flex gap-2">
          {isStaff && loan.status === 'pending' && (
            <button onClick={approveLoan} className="btn-success">
              Approve Loan
            </button>
          )}
          {isStaff && loan.status === 'approved' && (
            <button onClick={disburseLoan} className="btn-primary">
              Disburse Loan
            </button>
          )}
          {isStaff && canRestructure && (
            <button onClick={openRestructureModal} className="btn-warning">
              Restructure Loan
            </button>
          )}
          <button onClick={downloadStatement} className="btn-secondary">
            Download Statement
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-sm text-gray-500">Principal</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(loan.principal)}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Monthly EMI</p>
          <p className="text-xl font-bold text-primary-600">{formatCurrency(loan.emiAmount)}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Outstanding</p>
          <p className="text-xl font-bold text-yellow-600">{formatCurrency(loan.outstandingAmount)}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">EMIs Paid</p>
          <p className="text-xl font-bold text-green-600">
            {loan.paidEMIs} / {loan.totalEMIs}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Loan Details */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold">Loan Details</h3>
          </div>
          <div className="card-body space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Interest Rate</span>
              <span>{loan.interestRate}% p.a. ({loan.interestType})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tenure</span>
              <span>{loan.tenureMonths} months</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Start Date</span>
              <span>{formatDate(loan.startDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">End Date</span>
              <span>{formatDate(loan.endDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Processing Fee</span>
              <span>{formatCurrency(loan.processingFee)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total Interest</span>
              <span>{formatCurrency(loan.totalInterest)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total Payable</span>
              <span>{formatCurrency(loan.totalPayable)}</span>
            </div>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold">Payment Summary</h3>
          </div>
          <div className="card-body space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total Paid</span>
              <span className="text-green-600 font-medium">{formatCurrency(loan.totalPaid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Outstanding Principal</span>
              <span>{formatCurrency(loan.outstandingPrincipal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total Penalty</span>
              <span className="text-red-600">{formatCurrency(loan.totalPenalty)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Overdue EMIs</span>
              <span className={loan.overdueEMIs > 0 ? 'text-red-600 font-medium' : ''}>
                {loan.overdueEMIs}
              </span>
            </div>
            {nextDueInfo && (
              <div className="flex justify-between">
                <span className="text-gray-500">Next Due Date</span>
                <span className={nextDueInfo.className}>
                  {formatDate(loan.nextDueDate)}
                </span>
              </div>
            )}
            {loan.nextEmiAmount && (
              <div className="flex justify-between">
                <span className="text-gray-500">Next EMI Amount</span>
                <span>{formatCurrency(loan.nextEmiAmount)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Risk Score */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold">Risk Assessment</h3>
          </div>
          <div className="card-body">
            <div className="text-center mb-4">
              <div className="w-24 h-24 mx-auto rounded-full bg-gray-100 flex items-center justify-center">
                <span className="text-3xl font-bold text-gray-900">{loan.riskScore || 50}</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">Risk Score</p>
              <span className={`${getRiskBadge(loan.riskCategory)} mt-2`}>
                {loan.riskCategory || 'Medium'} Risk
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Completion</span>
                <span>{loan.completionPercentage || 0}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-600 rounded-full"
                  style={{ width: `${loan.completionPercentage || 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* EMI Schedule */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold">EMI Schedule</h3>
        </div>
        <EmiTable emis={emis} onPayEmi={handlePayEmi} showActions={isStaff} />
      </div>

      {/* Payment Modal */}
      {paymentModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md animate-fade-in">
            <div className="card-header flex justify-between items-center">
              <h3 className="text-lg font-semibold">Record Payment</h3>
              <button
                onClick={() => setPaymentModal({ open: false, emi: null })}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={submitPayment} className="card-body space-y-4">
              <div>
                <p className="text-sm text-gray-500">EMI #{paymentModal.emi?.sequence}</p>
                <p className="font-medium">
                  Due: {formatDate(paymentModal.emi?.dueDate)} |
                  Amount: {formatCurrency(paymentModal.emi?.amount)}
                </p>
              </div>
              <div>
                <label className="label">Payment Amount (₹)</label>
                <input
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  className="input"
                  required
                  min="1"
                />
              </div>
              <div>
                <label className="label">Payment Mode</label>
                <select
                  value={paymentData.mode}
                  onChange={(e) => setPaymentData({ ...paymentData, mode: e.target.value })}
                  className="input"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Card</option>
                </select>
              </div>
              <div>
                <label className="label">Reference Number (Optional)</label>
                <input
                  type="text"
                  value={paymentData.referenceNumber}
                  onChange={(e) => setPaymentData({ ...paymentData, referenceNumber: e.target.value })}
                  className="input"
                  placeholder="Transaction ID"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setPaymentModal({ open: false, emi: null })}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restructure Modal */}
      {restructureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="card w-full max-w-2xl my-8 animate-fade-in">
            <div className="card-header flex justify-between items-center">
              <h3 className="text-lg font-semibold">Restructure Loan</h3>
              <button
                onClick={() => setRestructureModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="card-body space-y-6">
              {/* Current Loan Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Current Loan Terms</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Outstanding Principal</p>
                    <p className="font-semibold">{formatCurrency(loan.outstandingPrincipal)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Current EMI</p>
                    <p className="font-semibold">{formatCurrency(loan.emiAmount)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Interest Rate</p>
                    <p className="font-semibold">{loan.interestRate}% p.a.</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Remaining EMIs</p>
                    <p className="font-semibold">{loan.totalEMIs - loan.paidEMIs}</p>
                  </div>
                </div>
              </div>

              {/* Restructure Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">New Tenure (months)</label>
                  <input
                    type="number"
                    value={restructureData.newTenure}
                    onChange={(e) => setRestructureData({ ...restructureData, newTenure: e.target.value })}
                    className="input"
                    min="1"
                    max="360"
                    placeholder={`Current: ${loan.totalEMIs - loan.paidEMIs} remaining`}
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty to keep current tenure</p>
                </div>
                <div>
                  <label className="label">New Interest Rate (% p.a.)</label>
                  <input
                    type="number"
                    value={restructureData.newInterestRate}
                    onChange={(e) => setRestructureData({ ...restructureData, newInterestRate: e.target.value })}
                    className="input"
                    min="0"
                    max="50"
                    step="0.1"
                    placeholder={`Current: ${loan.interestRate}%`}
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty to keep current rate</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="startFromNext"
                  checked={restructureData.startFromNext}
                  onChange={(e) => setRestructureData({ ...restructureData, startFromNext: e.target.checked })}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <label htmlFor="startFromNext" className="text-sm text-gray-700">
                  Start new schedule from next EMI date
                </label>
              </div>

              {/* Preview Button */}
              <button
                onClick={handlePreviewRestructure}
                disabled={previewLoading || (!restructureData.newTenure && !restructureData.newInterestRate)}
                className="btn-secondary w-full"
              >
                {previewLoading ? 'Calculating...' : 'Preview Changes'}
              </button>

              {/* Preview Results */}
              {restructurePreview && (
                <div className="border border-primary-200 rounded-lg p-4 bg-primary-50">
                  <h4 className="font-medium text-primary-900 mb-3">Restructure Preview</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-500 mb-2">Current Terms</h5>
                      <div className="space-y-1 text-sm">
                        <p>EMI: <span className="font-semibold">{formatCurrency(restructurePreview.current.emiAmount)}</span></p>
                        <p>Interest Rate: <span className="font-semibold">{restructurePreview.current.interestRate}%</span></p>
                        <p>Remaining EMIs: <span className="font-semibold">{restructurePreview.current.remainingEMIs}</span></p>
                        <p>Total Remaining: <span className="font-semibold">{formatCurrency(restructurePreview.current.totalRemaining)}</span></p>
                      </div>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-gray-500 mb-2">Proposed Terms</h5>
                      <div className="space-y-1 text-sm">
                        <p>EMI: <span className="font-semibold text-primary-600">{formatCurrency(restructurePreview.proposed.emiAmount)}</span></p>
                        <p>Interest Rate: <span className="font-semibold text-primary-600">{restructurePreview.proposed.interestRate}%</span></p>
                        <p>New Tenure: <span className="font-semibold text-primary-600">{restructurePreview.proposed.newTenure} months</span></p>
                        <p>Total Remaining: <span className="font-semibold text-primary-600">{formatCurrency(restructurePreview.proposed.totalPayable)}</span></p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-primary-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">EMI Change:</span>
                      <span className={restructurePreview.comparison.emiDifference < 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                        {restructurePreview.comparison.emiDifference < 0 ? '↓ ' : '↑ '}
                        {formatCurrency(Math.abs(restructurePreview.comparison.emiDifference))}
                        ({restructurePreview.comparison.emiPercentChange > 0 ? '+' : ''}{restructurePreview.comparison.emiPercentChange.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600">Total Interest Change:</span>
                      <span className={restructurePreview.comparison.totalInterestDifference < 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                        {restructurePreview.comparison.totalInterestDifference < 0 ? '↓ ' : '↑ '}
                        {formatCurrency(Math.abs(restructurePreview.comparison.totalInterestDifference))}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="label">Reason for Restructuring *</label>
                <textarea
                  value={restructureData.reason}
                  onChange={(e) => setRestructureData({ ...restructureData, reason: e.target.value })}
                  className="input"
                  rows="3"
                  placeholder="Explain why this loan needs to be restructured (min 10 characters)..."
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => setRestructureModal(false)}
                  className="btn-secondary flex-1"
                  disabled={restructureLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRestructure}
                  disabled={restructureLoading || !restructurePreview || !restructureData.reason}
                  className="btn-primary flex-1"
                >
                  {restructureLoading ? 'Processing...' : 'Confirm Restructure'}
                </button>
              </div>

              {!restructurePreview && (
                <p className="text-sm text-gray-500 text-center">
                  Please preview the changes before confirming
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanAccountDetail;
