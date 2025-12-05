// client/src/pages/customer/LoanProducts.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loanApplicationAPI } from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import toast from 'react-hot-toast';

const LoanProducts = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchProducts();
  }, []);

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

  const categories = [
    { id: 'all', name: 'All Products', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { id: 'personal', name: 'Personal Loan', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { id: 'business', name: 'Business Loan', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { id: 'home', name: 'Home Loan', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'vehicle', name: 'Vehicle Loan', icon: 'M8 17h8M8 17v4h8v-4M8 17l-2-6h12l-2 6M6 11V7a4 4 0 014-4h4a4 4 0 014 4v4' },
    { id: 'education', name: 'Education Loan', icon: 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z' },
  ];

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => p.category === selectedCategory);

  const getCategoryColor = (category) => {
    const colors = {
      personal: { bg: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-600' },
      business: { bg: 'bg-purple-500', light: 'bg-purple-100', text: 'text-purple-600' },
      home: { bg: 'bg-emerald-500', light: 'bg-emerald-100', text: 'text-emerald-600' },
      vehicle: { bg: 'bg-orange-500', light: 'bg-orange-100', text: 'text-orange-600' },
      education: { bg: 'bg-pink-500', light: 'bg-pink-100', text: 'text-pink-600' },
      gold: { bg: 'bg-amber-500', light: 'bg-amber-100', text: 'text-amber-600' },
      agriculture: { bg: 'bg-green-500', light: 'bg-green-100', text: 'text-green-600' },
    };
    return colors[category] || { bg: 'bg-gray-500', light: 'bg-gray-100', text: 'text-gray-600' };
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-gray-200 rounded-3xl" />
        <div className="flex gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 w-28 bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-72 bg-gray-200 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-purple-700 p-8 text-white shadow-2xl shadow-primary-500/30">
        <div className="absolute -right-20 -top-20 w-60 h-60 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-20 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">Loan Products</h1>
              <p className="text-primary-100 mt-1">Choose from our range of loan products</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="bg-white/20 backdrop-blur px-4 py-2 rounded-xl">
              <span className="text-primary-100 text-sm">Interest from</span>
              <p className="font-bold text-lg">8.5% p.a.</p>
            </div>
            <div className="bg-white/20 backdrop-blur px-4 py-2 rounded-xl">
              <span className="text-primary-100 text-sm">Loan amount up to</span>
              <p className="font-bold text-lg">{formatCurrency(5000000)}</p>
            </div>
            <div className="bg-white/20 backdrop-blur px-4 py-2 rounded-xl">
              <span className="text-primary-100 text-sm">Tenure up to</span>
              <p className="font-bold text-lg">84 months</p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-3">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
              selectedCategory === cat.id
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={cat.icon} />
            </svg>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 2a10 10 0 110 20 10 10 0 010-20z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Products Found</h3>
          <p className="text-gray-500">No loan products available in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {filteredProducts.map((product) => {
            const colors = getCategoryColor(product.category);
            return (
              <div
                key={product._id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group flex flex-col h-full"
              >
                {/* Product Header - Fixed Height */}
                <div className={`${colors.bg} p-6 text-white relative overflow-hidden min-h-[140px]`}>
                  <div className="absolute -right-8 -top-8 w-24 h-24 bg-white/10 rounded-full" />
                  <div className="absolute right-4 bottom-4 w-12 h-12 bg-white/10 rounded-full" />
                  <div className="relative">
                    <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full uppercase">
                      {product.category}
                    </span>
                    <h3 className="text-xl font-bold mt-3">{product.name}</h3>
                    <p className="text-white/80 text-sm mt-1 line-clamp-2">{product.description || 'Flexible loan options tailored for your needs'}</p>
                  </div>
                </div>

                {/* Product Details - Flex Grow */}
                <div className="p-6 flex flex-col flex-grow">
                  <div className="space-y-4 flex-grow">
                    {/* Interest Rate */}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-sm">Interest Rate</span>
                      <span className="font-bold text-lg text-primary-600">{product.interestRate}% p.a.</span>
                    </div>

                    {/* Loan Amount Range */}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-sm">Loan Amount</span>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(product.minAmount)} - {formatCurrency(product.maxAmount)}
                      </span>
                    </div>

                    {/* Tenure Range */}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-sm">Tenure</span>
                      <span className="font-semibold text-gray-900">
                        {product.minTenureMonths} - {product.maxTenureMonths} months
                      </span>
                    </div>

                    {/* Processing Fee */}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-sm">Processing Fee</span>
                      <span className="font-semibold text-gray-900">
                        {product.processingFee?.type === 'percentage'
                          ? `${product.processingFee.value}%`
                          : formatCurrency(product.processingFee?.value || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Apply Button - Always at Bottom */}
                  <button
                    onClick={() => navigate(`/dashboard/customer/apply-loan?product=${product._id}`)}
                    className={`w-full mt-6 py-3 rounded-xl font-semibold text-white ${colors.bg} hover:opacity-90 transition-all flex items-center justify-center gap-2 group-hover:shadow-lg`}
                  >
                    Apply Now
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LoanProducts;
