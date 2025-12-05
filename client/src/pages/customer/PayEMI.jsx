// client/src/pages/customer/PayEMI.jsx
import { useState, useEffect } from 'react';
import { onlinePaymentAPI } from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import toast from 'react-hot-toast';

const PayEMI = () => {
  const [loading, setLoading] = useState(true);
  const [loansData, setLoansData] = useState({ loans: [], totalDue: 0 });
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedEMIs, setSelectedEMIs] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [showUPIModal, setShowUPIModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [upiData, setUpiData] = useState(null);
  const [bankDetails, setBankDetails] = useState(null);
  const [upiTransactionId, setUpiTransactionId] = useState('');
  const [razorpayConfig, setRazorpayConfig] = useState(null);
  const [useCustomAmount, setUseCustomAmount] = useState(false);
  const [customAmount, setCustomAmount] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [emisResponse, methodsResponse] = await Promise.all([
        onlinePaymentAPI.getPendingEMIs(),
        onlinePaymentAPI.getMethods(),
      ]);
      setLoansData(emisResponse.data.data);
      setPaymentMethods(methodsResponse.data.data.methods);
      setRazorpayConfig(methodsResponse.data.data.config);
    } catch (error) {
      toast.error('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const toggleEMISelection = (emiId, loanId) => {
    setSelectedEMIs((prev) => {
      const exists = prev.find((e) => e.emiId === emiId);
      if (exists) {
        return prev.filter((e) => e.emiId !== emiId);
      }
      return [...prev, { emiId, loanId }];
    });
  };

  const calculateSelectedTotal = () => {
    let total = 0;
    loansData.loans.forEach((loan) => {
      loan.pendingEmis.forEach((emi) => {
        if (selectedEMIs.find((e) => e.emiId === emi.emiId)) {
          total += emi.totalDue;
        }
      });
    });
    return total;
  };

  const getPaymentAmount = () => {
    if (useCustomAmount && customAmount) {
      return parseFloat(customAmount);
    }
    return calculateSelectedTotal();
  };

  const handlePaymentMethodSelect = (method) => {
    if (selectedEMIs.length === 0) {
      toast.error('Please select at least one EMI to pay');
      return;
    }
    setSelectedMethod(method);
  };

  const initiatePayment = async () => {
    if (!selectedMethod) {
      toast.error('Please select a payment method');
      return;
    }

    const emiIds = selectedEMIs.map((e) => e.emiId);
    const amount = getPaymentAmount();

    // Validate custom amount
    if (useCustomAmount) {
      const minAmount = 100; // Minimum ₹100
      const maxAmount = calculateSelectedTotal();

      if (!customAmount || isNaN(amount)) {
        toast.error('Please enter a valid amount');
        return;
      }
      if (amount < minAmount) {
        toast.error(`Minimum payment amount is ${formatCurrency(minAmount)}`);
        return;
      }
      if (amount > maxAmount) {
        toast.error(`Amount cannot exceed total due: ${formatCurrency(maxAmount)}`);
        return;
      }
    }

    try {
      setProcessing(true);

      if (selectedMethod.id === 'razorpay') {
        await initiateRazorpayPayment(emiIds, amount);
      } else if (selectedMethod.id === 'upi') {
        await initiateUPIPayment(emiIds, amount);
      } else if (selectedMethod.id === 'bank_transfer') {
        await showBankTransferDetails();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Payment initiation failed');
    } finally {
      setProcessing(false);
    }
  };

  const initiateRazorpayPayment = async (emiIds, amount) => {
    const response = await onlinePaymentAPI.createRazorpayOrder({ emiIds, amount });
    const { order, key, prefill } = response.data.data;

    const options = {
      key,
      amount: order.amount * 100,
      currency: order.currency,
      name: 'LoanSphere',
      description: 'EMI Payment',
      order_id: order.orderId,
      prefill,
      theme: { color: '#4F46E5' },
      handler: async (response) => {
        try {
          await onlinePaymentAPI.verifyRazorpayPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            emiIds,
          });
          toast.success('Payment successful!');
          setSelectedEMIs([]);
          setSelectedMethod(null);
          fetchData();
        } catch (error) {
          toast.error('Payment verification failed');
        }
      },
      modal: {
        ondismiss: () => {
          toast.error('Payment cancelled');
        },
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
  };

  const initiateUPIPayment = async (emiIds, amount) => {
    const response = await onlinePaymentAPI.generateUPI({ emiIds, amount });
    setUpiData(response.data.data);
    setShowUPIModal(true);
  };

  const submitUPIPayment = async () => {
    if (!upiTransactionId.trim()) {
      toast.error('Please enter UPI Transaction ID');
      return;
    }

    try {
      setProcessing(true);
      await onlinePaymentAPI.submitUPIPayment({
        emiIds: selectedEMIs.map((e) => e.emiId),
        amount: calculateSelectedTotal(),
        upiTransactionId: upiTransactionId.trim(),
        paymentRef: upiData?.paymentRef,
      });
      toast.success('Payment submitted for verification!');
      setShowUPIModal(false);
      setUpiTransactionId('');
      setSelectedEMIs([]);
      setSelectedMethod(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Submission failed');
    } finally {
      setProcessing(false);
    }
  };

  const showBankTransferDetails = async () => {
    try {
      const response = await onlinePaymentAPI.getBankDetails();
      setBankDetails(response.data.data);
      setShowBankModal(true);
    } catch (error) {
      toast.error('Failed to load bank details');
    }
  };

  const getMethodIcon = (id) => {
    const icons = {
      razorpay: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.436 0H1.564C.7 0 0 .7 0 1.564v20.872C0 23.3.7 24 1.564 24h20.872c.864 0 1.564-.7 1.564-1.564V1.564C24 .7 23.3 0 22.436 0zM9.5 18.5L5 5.5h3l2.5 8 2.5-8h3l-4.5 13h-2zm8.5-5.5l-2-6h2.5l1 3.5 1-3.5H23l-2 6h-3z"/>
        </svg>
      ),
      upi: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      bank_transfer: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    };
    return icons[id] || icons.bank_transfer;
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-gray-200 rounded-2xl" />
        <div className="h-64 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  const selectedTotal = calculateSelectedTotal();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-3xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Pay EMI</h1>
        <p className="text-primary-100">Select EMIs and choose your preferred payment method</p>
        <div className="mt-4 flex items-center gap-4">
          <div className="bg-white/20 rounded-xl px-4 py-2">
            <p className="text-sm text-primary-100">Total Due</p>
            <p className="text-xl font-bold">{formatCurrency(loansData.totalDue)}</p>
          </div>
          {selectedTotal > 0 && (
            <div className="bg-white/30 rounded-xl px-4 py-2">
              <p className="text-sm text-primary-100">Selected</p>
              <p className="text-xl font-bold">{formatCurrency(selectedTotal)}</p>
            </div>
          )}
        </div>
      </div>

      {loansData.loans.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">All Caught Up!</h3>
          <p className="text-gray-500">You have no pending EMI payments at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* EMI Selection */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Select EMIs to Pay</h2>
            {loansData.loans.map((loan) => (
              <div key={loan.loanId} className="card overflow-hidden">
                <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{loan.productName}</p>
                      <p className="text-sm text-gray-500">{loan.accountNumber}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      loan.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {loan.status}
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {loan.pendingEmis.map((emi) => {
                    const isSelected = selectedEMIs.find((e) => e.emiId === emi.emiId);
                    return (
                      <label
                        key={emi.emiId}
                        className={`flex items-center gap-4 p-4 cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!!isSelected}
                          onChange={() => toggleEMISelection(emi.emiId, loan.loanId)}
                          className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">EMI #{emi.sequence}</span>
                            {emi.isOverdue && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                                {emi.daysOverdue} days overdue
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">Due: {formatDate(emi.dueDate)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatCurrency(emi.totalDue)}</p>
                          {emi.penaltyAmount > 0 && (
                            <p className="text-xs text-red-600">+{formatCurrency(emi.penaltyAmount)} penalty</p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Payment Methods */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Payment Method</h2>
            <div className="card p-4 space-y-3">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => handlePaymentMethodSelect(method)}
                  disabled={!method.enabled || selectedEMIs.length === 0}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                    selectedMethod?.id === method.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${(!method.enabled || selectedEMIs.length === 0) && 'opacity-50 cursor-not-allowed'}`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedMethod?.id === method.id ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {getMethodIcon(method.id)}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-gray-900">{method.name}</p>
                    <p className="text-sm text-gray-500">{method.description}</p>
                  </div>
                  {selectedMethod?.id === method.id && (
                    <svg className="w-6 h-6 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>

            {/* Part Payment Option */}
            {selectedTotal > 0 && (
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900">Part Payment</h3>
                    <p className="text-sm text-gray-500">Pay a custom amount</p>
                  </div>
                  <button
                    onClick={() => {
                      setUseCustomAmount(!useCustomAmount);
                      if (!useCustomAmount) {
                        setCustomAmount('');
                      }
                    }}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      useCustomAmount ? 'bg-primary-600' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      useCustomAmount ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>

                {useCustomAmount && (
                  <div className="space-y-3 animate-fade-in">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Enter Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
                        <input
                          type="number"
                          value={customAmount}
                          onChange={(e) => setCustomAmount(e.target.value)}
                          placeholder={calculateSelectedTotal().toString()}
                          className="input pl-8"
                          min="100"
                          max={calculateSelectedTotal()}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Min: ₹100 | Max: {formatCurrency(selectedTotal)}
                      </p>
                    </div>

                    {/* Quick amount buttons */}
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: '25%', value: Math.round(selectedTotal * 0.25) },
                        { label: '50%', value: Math.round(selectedTotal * 0.5) },
                        { label: '75%', value: Math.round(selectedTotal * 0.75) },
                        { label: 'Full', value: selectedTotal },
                      ].map((option) => (
                        <button
                          key={option.label}
                          onClick={() => setCustomAmount(option.value.toString())}
                          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                            parseInt(customAmount) === option.value
                              ? 'bg-primary-100 border-primary-500 text-primary-700'
                              : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    <div className="bg-amber-50 rounded-lg p-3 flex items-start gap-2">
                      <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-amber-800">
                        Part payments will be applied to your oldest EMI first. Remaining balance will still be due.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Pay Button */}
            {selectedTotal > 0 && selectedMethod && (
              <button
                onClick={initiatePayment}
                disabled={processing || (useCustomAmount && (!customAmount || parseFloat(customAmount) < 100))}
                className="w-full btn-primary py-4 text-lg font-semibold disabled:opacity-50"
              >
                {processing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  `Pay ${formatCurrency(getPaymentAmount())}`
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* UPI Modal */}
      {showUPIModal && upiData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-in">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Pay via UPI</h2>
              <p className="text-gray-500 mt-1">Amount: {formatCurrency(upiData.amount)}</p>
            </div>
            <div className="p-6 space-y-4">
              {/* QR Code placeholder - In production, generate actual QR */}
              <div className="bg-gray-100 rounded-xl p-6 text-center">
                <div className="w-48 h-48 mx-auto bg-white rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    <p className="text-sm text-gray-500">Scan QR to pay</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-gray-600">Or pay to UPI ID:</p>
                <p className="font-mono font-bold text-primary-600 text-lg">{upiData.upi?.payeeVPA}</p>
              </div>

              <div className="bg-amber-50 rounded-xl p-4">
                <p className="text-sm text-amber-800">
                  After completing payment, enter the UPI Transaction ID below for verification.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  UPI Transaction ID / UTR Number
                </label>
                <input
                  type="text"
                  value={upiTransactionId}
                  onChange={(e) => setUpiTransactionId(e.target.value)}
                  placeholder="Enter 12-digit transaction ID"
                  className="input"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => {
                  setShowUPIModal(false);
                  setUpiTransactionId('');
                }}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={submitUPIPayment}
                disabled={processing || !upiTransactionId.trim()}
                className="flex-1 btn-primary"
              >
                {processing ? 'Submitting...' : 'Submit for Verification'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bank Transfer Modal */}
      {showBankModal && bankDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-in">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Bank Transfer Details</h2>
              <p className="text-gray-500 mt-1">Transfer {formatCurrency(selectedTotal)} to:</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                {[
                  { label: 'Bank Name', value: bankDetails.bankDetails?.bankName },
                  { label: 'Account Name', value: bankDetails.bankDetails?.accountName },
                  { label: 'Account Number', value: bankDetails.bankDetails?.accountNumber },
                  { label: 'IFSC Code', value: bankDetails.bankDetails?.ifscCode },
                  { label: 'Branch', value: bankDetails.bankDetails?.branch },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-medium text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="bg-primary-50 rounded-xl p-4">
                <p className="text-sm font-medium text-primary-800 mb-2">Important:</p>
                <ul className="text-sm text-primary-700 space-y-1">
                  {bankDetails.instructions?.map((inst, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
                      {inst}
                    </li>
                  ))}
                </ul>
              </div>

              {bankDetails.loanAccounts?.length > 0 && (
                <div className="text-center">
                  <p className="text-sm text-gray-600">Your Loan Account(s):</p>
                  <p className="font-mono font-semibold text-gray-900">
                    {bankDetails.loanAccounts.join(', ')}
                  </p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100">
              <button
                onClick={() => setShowBankModal(false)}
                className="w-full btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayEMI;
