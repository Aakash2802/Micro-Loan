// client/src/pages/LoanCalculator.jsx
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';

const LoanCalculator = () => {
  const [loanAmount, setLoanAmount] = useState(100000);
  const [interestRate, setInterestRate] = useState(12);
  const [tenure, setTenure] = useState(12);
  const [tenureType, setTenureType] = useState('months');

  // Calculate EMI
  const calculation = useMemo(() => {
    const principal = parseFloat(loanAmount) || 0;
    const rate = parseFloat(interestRate) || 0;
    const months = tenureType === 'years' ? (parseInt(tenure) || 0) * 12 : (parseInt(tenure) || 0);

    if (principal <= 0 || rate <= 0 || months <= 0) {
      return { emi: 0, totalAmount: 0, totalInterest: 0, months: 0 };
    }

    const monthlyRate = rate / 12 / 100;
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
                (Math.pow(1 + monthlyRate, months) - 1);
    const totalAmount = emi * months;
    const totalInterest = totalAmount - principal;

    return {
      emi: Math.round(emi),
      totalAmount: Math.round(totalAmount),
      totalInterest: Math.round(totalInterest),
      months,
    };
  }, [loanAmount, interestRate, tenure, tenureType]);

  // Generate amortization schedule
  const schedule = useMemo(() => {
    if (calculation.emi <= 0) return [];

    const principal = parseFloat(loanAmount);
    const rate = parseFloat(interestRate) / 12 / 100;
    let balance = principal;
    const items = [];

    for (let i = 1; i <= calculation.months; i++) {
      const interest = Math.round(balance * rate);
      const principalPaid = calculation.emi - interest;
      balance = Math.max(0, balance - principalPaid);

      items.push({
        month: i,
        emi: calculation.emi,
        principal: principalPaid,
        interest,
        balance: Math.round(balance),
      });
    }

    return items;
  }, [calculation, loanAmount, interestRate]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  // Calculate pie chart percentages
  const principalPercentage = calculation.totalAmount > 0
    ? (parseFloat(loanAmount) / calculation.totalAmount) * 100
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">LoanSphere</span>
            </Link>
            <Link
              to="/login"
              className="px-5 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors"
            >
              Login
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
            EMI Calculator
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Calculate your monthly EMI, total interest, and view the complete repayment schedule for your loan.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calculator Inputs */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                Loan Details
              </h2>

              {/* Loan Amount */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Loan Amount</label>
                  <span className="text-sm font-semibold text-primary-600">{formatCurrency(loanAmount)}</span>
                </div>
                <input
                  type="range"
                  min="10000"
                  max="5000000"
                  step="10000"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>₹10K</span>
                  <span>₹50L</span>
                </div>
                <input
                  type="number"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Math.min(5000000, Math.max(10000, e.target.value)))}
                  className="mt-2 w-full px-4 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  placeholder="Enter amount"
                />
              </div>

              {/* Interest Rate */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Interest Rate (% p.a.)</label>
                  <span className="text-sm font-semibold text-primary-600">{interestRate}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="36"
                  step="0.5"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1%</span>
                  <span>36%</span>
                </div>
                <input
                  type="number"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Math.min(36, Math.max(1, e.target.value)))}
                  className="mt-2 w-full px-4 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  placeholder="Enter rate"
                  step="0.5"
                />
              </div>

              {/* Tenure */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Loan Tenure</label>
                  <span className="text-sm font-semibold text-primary-600">
                    {tenure} {tenureType}
                  </span>
                </div>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setTenureType('months')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      tenureType === 'months'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Months
                  </button>
                  <button
                    onClick={() => setTenureType('years')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      tenureType === 'years'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Years
                  </button>
                </div>
                <input
                  type="range"
                  min="1"
                  max={tenureType === 'years' ? '30' : '360'}
                  step="1"
                  value={tenure}
                  onChange={(e) => setTenure(e.target.value)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1</span>
                  <span>{tenureType === 'years' ? '30' : '360'}</span>
                </div>
              </div>

              {/* Apply Now CTA */}
              <Link
                to="/register"
                className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg shadow-primary-500/30 flex items-center justify-center gap-2"
              >
                Apply for Loan
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* EMI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
                <p className="text-primary-100 text-sm mb-1">Monthly EMI</p>
                <p className="text-3xl font-bold">{formatCurrency(calculation.emi)}</p>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <p className="text-gray-500 text-sm mb-1">Total Interest</p>
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(calculation.totalInterest)}</p>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <p className="text-gray-500 text-sm mb-1">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(calculation.totalAmount)}</p>
              </div>
            </div>

            {/* Pie Chart Visualization */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-6">Payment Breakdown</h3>
              <div className="flex flex-col sm:flex-row items-center gap-8">
                {/* Pie Chart */}
                <div className="relative w-48 h-48">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="20"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="20"
                      strokeDasharray={`${principalPercentage * 2.51} 251`}
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-2xl font-bold text-gray-900">{formatNumber(calculation.months)}</p>
                    <p className="text-sm text-gray-500">months</p>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between p-4 bg-primary-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-primary-600 rounded-full" />
                      <span className="font-medium text-gray-900">Principal Amount</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatCurrency(loanAmount)}</p>
                      <p className="text-sm text-gray-500">{principalPercentage.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-amber-500 rounded-full" />
                      <span className="font-medium text-gray-900">Total Interest</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatCurrency(calculation.totalInterest)}</p>
                      <p className="text-sm text-gray-500">{(100 - principalPercentage).toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Amortization Schedule */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Amortization Schedule</h3>
                <p className="text-sm text-gray-500 mt-1">Month-wise breakdown of your loan repayment</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Month</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">EMI</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Principal</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Interest</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {schedule.slice(0, 12).map((row) => (
                      <tr key={row.month} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {row.month}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatCurrency(row.emi)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-600 text-right font-medium">
                          {formatCurrency(row.principal)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-amber-600 text-right">
                          {formatCurrency(row.interest)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatCurrency(row.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {schedule.length > 12 && (
                <div className="p-4 bg-gray-50 text-center">
                  <p className="text-sm text-gray-500">
                    Showing first 12 months of {schedule.length} months
                  </p>
                </div>
              )}
            </div>

            {/* Disclaimer */}
            <div className="bg-amber-50 rounded-xl p-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-amber-800">
                <strong>Disclaimer:</strong> This calculator provides an estimate based on the information you provide.
                Actual EMI may vary based on loan product, processing fees, and other factors.
                Please contact us for accurate loan details.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xl font-bold">LoanSphere</span>
            </div>
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} LoanSphere. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LoanCalculator;
