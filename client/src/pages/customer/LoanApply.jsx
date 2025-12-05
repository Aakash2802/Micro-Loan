// client/src/pages/customer/LoanApply.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loanApplicationAPI } from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import toast from 'react-hot-toast';

const LoanApply = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedProduct = searchParams.get('product');

  const [step, setStep] = useState(1);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [eligibilityChecked, setEligibilityChecked] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);

  const [formData, setFormData] = useState({
    productId: preselectedProduct || '',
    requestedAmount: '',
    requestedTenure: '',
    purpose: '',
  });

  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (formData.productId && products.length > 0) {
      const product = products.find(p => p._id === formData.productId);
      setSelectedProduct(product);
      // Reset eligibility when product changes
      setEligibilityChecked(false);
      setEligibilityResult(null);
    }
  }, [formData.productId, products]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await loanApplicationAPI.getProducts();
      setProducts(response.data.data.products);
    } catch (error) {
      toast.error('Failed to load loan products');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Reset eligibility when amount or tenure changes
    if (name === 'requestedAmount' || name === 'requestedTenure') {
      setEligibilityChecked(false);
      setEligibilityResult(null);
    }
  };

  const checkEligibility = async () => {
    if (!formData.productId || !formData.requestedAmount || !formData.requestedTenure) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setCheckingEligibility(true);
      const response = await loanApplicationAPI.checkEligibility({
        productId: formData.productId,
        requestedAmount: parseFloat(formData.requestedAmount),
        requestedTenure: parseInt(formData.requestedTenure),
      });
      setEligibilityResult(response.data.data);
      setEligibilityChecked(true);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to check eligibility';
      toast.error(message);
    } finally {
      setCheckingEligibility(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.purpose || formData.purpose.length < 10) {
      toast.error('Please provide a detailed purpose (at least 10 characters)');
      return;
    }

    try {
      setSubmitting(true);
      const response = await loanApplicationAPI.submit({
        productId: formData.productId,
        requestedAmount: parseFloat(formData.requestedAmount),
        requestedTenure: parseInt(formData.requestedTenure),
        purpose: formData.purpose,
      });
      toast.success('Loan application submitted successfully!');
      navigate('/dashboard/customer/my-applications');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to submit application';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const canProceedToStep2 = eligibilityChecked && eligibilityResult?.eligible;
  const canSubmit = formData.purpose.length >= 10;

  // Steps config
  const steps = [
    { number: 1, title: 'Select Loan', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { number: 2, title: 'Loan Details', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { number: 3, title: 'Review & Submit', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-gray-200 rounded-2xl" />
        <div className="h-96 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/customer/loan-products')}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Apply for Loan</h1>
            <p className="text-gray-500">Complete the form to submit your loan application</p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          {steps.map((s, idx) => (
            <div key={s.number} className="flex items-center flex-1">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                  step >= s.number
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} />
                  </svg>
                </div>
                <div className="hidden sm:block">
                  <p className={`text-sm font-medium ${step >= s.number ? 'text-primary-600' : 'text-gray-400'}`}>
                    Step {s.number}
                  </p>
                  <p className={`text-sm ${step >= s.number ? 'text-gray-900' : 'text-gray-400'}`}>
                    {s.title}
                  </p>
                </div>
              </div>
              {idx < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-4 rounded-full ${
                  step > s.number ? 'bg-primary-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          {/* Step 1: Select Product & Check Eligibility */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Select Loan Product</h2>

              {/* Product Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Loan Product</label>
                <select
                  name="productId"
                  value={formData.productId}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                >
                  <option value="">Select a loan product</option>
                  {products.map(product => (
                    <option key={product._id} value={product._id}>
                      {product.name} - {product.interestRate}% p.a.
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount & Tenure */}
              {selectedProduct && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Loan Amount
                        <span className="text-gray-400 font-normal ml-2">
                          ({formatCurrency(selectedProduct.minAmount)} - {formatCurrency(selectedProduct.maxAmount)})
                        </span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                        <input
                          type="number"
                          name="requestedAmount"
                          value={formData.requestedAmount}
                          onChange={handleInputChange}
                          placeholder="Enter amount"
                          min={selectedProduct.minAmount}
                          max={selectedProduct.maxAmount}
                          className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tenure (Months)
                        <span className="text-gray-400 font-normal ml-2">
                          ({selectedProduct.minTenureMonths} - {selectedProduct.maxTenureMonths})
                        </span>
                      </label>
                      <input
                        type="number"
                        name="requestedTenure"
                        value={formData.requestedTenure}
                        onChange={handleInputChange}
                        placeholder="Enter tenure"
                        min={selectedProduct.minTenureMonths}
                        max={selectedProduct.maxTenureMonths}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Check Eligibility Button */}
                  <button
                    onClick={checkEligibility}
                    disabled={checkingEligibility || !formData.requestedAmount || !formData.requestedTenure}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold hover:from-primary-700 hover:to-primary-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {checkingEligibility ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Checking Eligibility...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Check Eligibility
                      </>
                    )}
                  </button>

                  {/* Eligibility Result */}
                  {eligibilityChecked && eligibilityResult && (
                    <div className={`p-6 rounded-xl border-2 ${
                      eligibilityResult.eligible
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          eligibilityResult.eligible ? 'bg-emerald-100' : 'bg-red-100'
                        }`}>
                          <svg className={`w-6 h-6 ${eligibilityResult.eligible ? 'text-emerald-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {eligibilityResult.eligible ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            )}
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className={`font-semibold ${eligibilityResult.eligible ? 'text-emerald-800' : 'text-red-800'}`}>
                            {eligibilityResult.eligible ? 'You are eligible!' : 'Not Eligible'}
                          </h3>
                          {eligibilityResult.reasons && eligibilityResult.reasons.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {eligibilityResult.reasons.map((reason, idx) => (
                                <li key={idx} className="text-sm text-red-700 flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                                  {reason}
                                </li>
                              ))}
                            </ul>
                          )}
                          {eligibilityResult.suggestions && eligibilityResult.suggestions.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-red-200">
                              <p className="text-sm font-medium text-red-800 mb-1">Suggestions:</p>
                              <ul className="space-y-1">
                                {eligibilityResult.suggestions.map((suggestion, idx) => (
                                  <li key={idx} className="text-sm text-red-700 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                                    {suggestion}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Next Button */}
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setStep(2)}
                  disabled={!canProceedToStep2}
                  className="px-6 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Continue
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Purpose & Details */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Loan Purpose</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Why do you need this loan?
                </label>
                <textarea
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleInputChange}
                  rows={5}
                  placeholder="Please describe the purpose of this loan in detail (minimum 10 characters)..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all resize-none"
                />
                <p className="text-sm text-gray-400 mt-1">
                  {formData.purpose.length}/500 characters (minimum 10)
                </p>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-800">Tips for a better application</p>
                    <ul className="mt-1 text-sm text-blue-700 space-y-1">
                      <li>Be specific about how you plan to use the funds</li>
                      <li>Mention any supporting documents you can provide</li>
                      <li>Include details about your repayment capacity</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!canSubmit}
                  className="px-6 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Review Application
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Submit */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Review Your Application</h2>

              {/* Summary */}
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Loan Product</h3>
                  <p className="text-lg font-semibold text-gray-900">{selectedProduct?.name}</p>
                  <p className="text-sm text-gray-500">{selectedProduct?.category} loan</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Loan Amount</h3>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(parseFloat(formData.requestedAmount))}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Tenure</h3>
                    <p className="text-xl font-bold text-gray-900">{formData.requestedTenure} months</p>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Purpose</h3>
                  <p className="text-gray-900">{formData.purpose}</p>
                </div>

                {eligibilityResult?.emiPreview && (
                  <div className="p-4 bg-primary-50 rounded-xl border border-primary-100">
                    <h3 className="text-sm font-medium text-primary-800 mb-3">EMI Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-primary-600">Monthly EMI</p>
                        <p className="text-xl font-bold text-primary-800">{formatCurrency(eligibilityResult.emiPreview.emiAmount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-primary-600">Interest Rate</p>
                        <p className="text-xl font-bold text-primary-800">{eligibilityResult.emiPreview.interestRate}% p.a.</p>
                      </div>
                      <div>
                        <p className="text-sm text-primary-600">Total Interest</p>
                        <p className="text-lg font-semibold text-primary-800">{formatCurrency(eligibilityResult.emiPreview.totalInterest)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-primary-600">Total Payable</p>
                        <p className="text-lg font-semibold text-primary-800">{formatCurrency(eligibilityResult.emiPreview.totalPayable)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Terms */}
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm text-amber-800">
                    By submitting this application, you agree to our terms and conditions.
                    Your application will be reviewed by our team and you will be notified of the decision.
                  </p>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold hover:from-emerald-700 hover:to-emerald-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Application
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - EMI Preview */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm sticky top-24">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Loan Summary</h3>

            {selectedProduct ? (
              <div className="space-y-4">
                <div className="p-4 bg-primary-50 rounded-xl">
                  <p className="text-sm text-primary-600 mb-1">Selected Product</p>
                  <p className="font-semibold text-primary-900">{selectedProduct.name}</p>
                </div>

                {formData.requestedAmount && (
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-500">Loan Amount</span>
                    <span className="font-semibold">{formatCurrency(parseFloat(formData.requestedAmount))}</span>
                  </div>
                )}

                {formData.requestedTenure && (
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-500">Tenure</span>
                    <span className="font-semibold">{formData.requestedTenure} months</span>
                  </div>
                )}

                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-500">Interest Rate</span>
                  <span className="font-semibold text-primary-600">{selectedProduct.interestRate}% p.a.</span>
                </div>

                {eligibilityResult?.emiPreview && (
                  <>
                    <div className="p-4 bg-emerald-50 rounded-xl">
                      <p className="text-sm text-emerald-600 mb-1">Monthly EMI</p>
                      <p className="text-2xl font-bold text-emerald-700">
                        {formatCurrency(eligibilityResult.emiPreview.emiAmount)}
                      </p>
                    </div>

                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-500">Processing Fee</span>
                      <span className="font-semibold">{formatCurrency(eligibilityResult.emiPreview.processingFee)}</span>
                    </div>

                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-500">Total Interest</span>
                      <span className="font-semibold">{formatCurrency(eligibilityResult.emiPreview.totalInterest)}</span>
                    </div>

                    <div className="flex justify-between items-center py-3">
                      <span className="text-gray-900 font-medium">Total Payable</span>
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(eligibilityResult.emiPreview.totalPayable)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-500">Select a loan product to see details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoanApply;
