// client/src/pages/LoanAccountCreate.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loanAccountAPI, loanProductAPI, customerAPI } from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDateForInput } from '../utils/formatDate';
import toast from 'react-hot-toast';

const LoanAccountCreate = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedCustomerId = searchParams.get('customerId');

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [emiPreview, setEmiPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    customerId: preselectedCustomerId || '',
    productId: '',
    principal: '',
    tenureMonths: '',
    startDate: formatDateForInput(new Date()),
    purpose: '',
    autoApprove: false,
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (formData.productId && formData.principal && formData.tenureMonths) {
      calculateEMI();
    } else {
      setEmiPreview(null);
    }
  }, [formData.productId, formData.principal, formData.tenureMonths]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [productsRes, customersRes] = await Promise.all([
        loanProductAPI.getAll({ active: true, published: true }),
        customerAPI.getAll({ limit: 100 }),
      ]);
      setProducts(productsRes.data.data.products);
      setCustomers(customersRes.data.data.customers);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const calculateEMI = async () => {
    try {
      const response = await loanProductAPI.calculateEMI(formData.productId, {
        principal: parseFloat(formData.principal),
        tenureMonths: parseInt(formData.tenureMonths),
      });
      setEmiPreview(response.data.data);
    } catch (error) {
      setEmiPreview(null);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Update tenure options when product changes
    if (name === 'productId' && value) {
      const product = products.find((p) => p._id === value);
      if (product) {
        setFormData((prev) => ({
          ...prev,
          tenureMonths: product.minTenureMonths.toString(),
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        customerId: formData.customerId,
        productId: formData.productId,
        principal: parseFloat(formData.principal),
        tenureMonths: parseInt(formData.tenureMonths),
        startDate: formData.startDate,
        purpose: formData.purpose,
        autoApprove: formData.autoApprove,
      };

      const response = await loanAccountAPI.create(payload);
      toast.success('Loan account created successfully');
      navigate(`/dashboard/loans/${response.data.data.loan._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create loan');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedProduct = products.find((p) => p._id === formData.productId);
  const selectedCustomer = customers.find((c) => c._id === formData.customerId);

  const filteredCustomers = customers.filter(
    (c) =>
      c.fullName.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone.includes(customerSearch)
  );

  const getCategoryConfig = (category) => {
    const configs = {
      personal: { bg: 'from-blue-500 to-blue-600', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
      business: { bg: 'from-purple-500 to-purple-600', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
      education: { bg: 'from-emerald-500 to-emerald-600', icon: 'M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222' },
      vehicle: { bg: 'from-amber-500 to-amber-600', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
      home: { bg: 'from-rose-500 to-rose-600', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      gold: { bg: 'from-yellow-500 to-orange-500', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    };
    return configs[category] || configs.personal;
  };

  // Loading State
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded-lg w-1/3" />
          <div className="h-4 bg-gray-100 rounded w-1/4" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 space-y-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-12 bg-gray-100 rounded-xl" />
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl p-6 h-fit">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-6" />
              <div className="h-32 bg-gray-100 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 animate-slide-in">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Create Loan Account</h1>
                <p className="text-gray-500 text-sm">Issue a new loan to a customer</p>
              </div>
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="hidden md:flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                step >= s
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {s}
              </div>
              {s < 3 && (
                <div className={`w-12 h-1 rounded-full transition-all ${step > s ? 'bg-emerald-500' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          {/* Step 1: Customer Selection */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm animate-scale-in">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Select Customer</h3>
                  <p className="text-sm text-gray-500">Choose the borrower for this loan</p>
                </div>
              </div>
              {selectedCustomer && (
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-medium rounded-lg">
                  Selected
                </span>
              )}
            </div>
            <div className="p-5">
              <div className="relative mb-3">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search by name or phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer._id}
                    onClick={() => customer.kycStatus === 'verified' && setFormData(prev => ({ ...prev, customerId: customer._id }))}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer ${
                      formData.customerId === customer._id
                        ? 'border-blue-500 bg-blue-50'
                        : customer.kycStatus !== 'verified'
                        ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        formData.customerId === customer._id ? 'bg-blue-500' : 'bg-gradient-to-br from-primary-400 to-primary-600'
                      }`}>
                        <span className="text-white font-bold">
                          {customer.fullName?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{customer.fullName}</p>
                        <p className="text-sm text-gray-500">{customer.phone}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                          customer.kycStatus === 'verified'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {customer.kycStatus}
                        </span>
                        {customer.kycStatus !== 'verified' && (
                          <p className="text-xs text-gray-400 mt-1">KYC Required</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedCustomer && (
                <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                      <span className="text-white font-bold text-lg">
                        {selectedCustomer.fullName?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{selectedCustomer.fullName}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        <span>Income: {formatCurrency(selectedCustomer.monthlyIncome)}/mo</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                        <span className="text-emerald-600 font-medium">KYC Verified</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Product Selection */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm animate-scale-in" style={{ animationDelay: '100ms' }}>
            <div className="p-5 border-b border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Choose Loan Product</h3>
                <p className="text-sm text-gray-500">Select the type of loan</p>
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {products.map((product) => {
                  const config = getCategoryConfig(product.category);
                  return (
                    <div
                      key={product._id}
                      onClick={() => handleChange({ target: { name: 'productId', value: product._id } })}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer group ${
                        formData.productId === product._id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.bg} flex items-center justify-center text-white group-hover:scale-110 transition-transform`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.code}</p>
                        </div>
                        {formData.productId === product._id && (
                          <svg className="w-6 h-6 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className={`text-2xl font-bold bg-gradient-to-r ${config.bg} bg-clip-text text-transparent`}>
                          {product.interestRate}%
                        </span>
                        <span className="text-gray-400">p.a.</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedProduct && (
                <div className="mt-4 p-4 bg-purple-50 rounded-xl">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 mb-1">Amount Range</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(selectedProduct.minAmount)} - {formatCurrency(selectedProduct.maxAmount)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Tenure</p>
                      <p className="font-semibold text-gray-900">{selectedProduct.minTenureMonths} - {selectedProduct.maxTenureMonths} months</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Processing Fee</p>
                      <p className="font-semibold text-gray-900">{selectedProduct.processingFee}{selectedProduct.processingFeeType === 'percentage' ? '%' : ' flat'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step 3: Loan Details */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm animate-scale-in" style={{ animationDelay: '200ms' }}>
            <div className="p-5 border-b border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Loan Details</h3>
                <p className="text-sm text-gray-500">Enter amount, tenure and other details</p>
              </div>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Principal Amount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</span>
                    <input
                      type="number"
                      name="principal"
                      value={formData.principal}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border-0 rounded-xl text-lg font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                      placeholder="Enter amount"
                      min={selectedProduct?.minAmount || 1000}
                      max={selectedProduct?.maxAmount || 10000000}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tenure (months)</label>
                  <div className="relative">
                    <input
                      type="number"
                      name="tenureMonths"
                      value={formData.tenureMonths}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-lg font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                      placeholder="Enter tenure"
                      min={selectedProduct?.minTenureMonths || 1}
                      max={selectedProduct?.maxTenureMonths || 360}
                      required
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">months</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Loan Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Purpose (Optional)</label>
                <textarea
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all resize-none"
                  rows={3}
                  placeholder="Describe the purpose of this loan..."
                />
              </div>

              <label className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl cursor-pointer hover:bg-amber-100 transition-colors">
                <input
                  type="checkbox"
                  name="autoApprove"
                  checked={formData.autoApprove}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <span className="font-medium text-gray-900">Auto-approve this loan</span>
                  <p className="text-sm text-gray-500">Skip manual approval and proceed to disbursement</p>
                </div>
              </label>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center gap-4 animate-fade-in" style={{ animationDelay: '300ms' }}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.customerId || !formData.productId || !formData.principal}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Creating Loan...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Create Loan Account</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* EMI Preview Sidebar */}
        <div className="lg:sticky lg:top-6 space-y-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">EMI Preview</h3>
            </div>
            {emiPreview ? (
              <div className="p-5 space-y-5">
                {/* EMI Amount Highlight */}
                <div className="p-6 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl text-white relative overflow-hidden">
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full pointer-events-none" />
                  <div className="absolute -right-2 top-8 w-16 h-16 bg-white/10 rounded-full pointer-events-none" />
                  <div className="relative">
                    <p className="text-emerald-100 text-sm mb-1">Monthly EMI</p>
                    <p className="text-3xl font-bold">
                      {formatCurrency(emiPreview.calculation.emiAmount)}
                    </p>
                    <p className="text-emerald-100 text-sm mt-2">for {formData.tenureMonths} months</p>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-gray-600">Principal</span>
                    </div>
                    <span className="font-semibold text-gray-900">{formatCurrency(emiPreview.calculation.principal)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-gray-600">Total Interest</span>
                    </div>
                    <span className="font-semibold text-gray-900">{formatCurrency(emiPreview.calculation.totalInterest)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      <span className="text-gray-600">Processing Fee</span>
                    </div>
                    <span className="font-semibold text-gray-900">{formatCurrency(emiPreview.calculation.processingFee)}</span>
                  </div>
                  <div className="h-px bg-gray-100 my-2" />
                  <div className="flex items-center justify-between py-2">
                    <span className="font-semibold text-gray-900">Total Payable</span>
                    <span className="text-lg font-bold text-gray-900">{formatCurrency(emiPreview.calculation.totalPayable)}</span>
                  </div>
                </div>

                {/* Amount Disbursed */}
                <div className="p-4 bg-emerald-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Amount Disbursed</p>
                      <p className="text-sm text-gray-400">After processing fee deduction</p>
                    </div>
                    <span className="text-xl font-bold text-emerald-600">
                      {formatCurrency(emiPreview.calculation.disbursedAmount)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">
                  Select a product and enter amount to see EMI preview
                </p>
              </div>
            )}
          </div>

          {/* Quick Info */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Quick Tips</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>- Customer must have verified KYC</li>
                  <li>- EMI starts from next month</li>
                  <li>- Processing fee is deducted upfront</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoanAccountCreate;
