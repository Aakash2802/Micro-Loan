// client/src/utils/formatCurrency.js

/**
 * Format number as Indian Rupee currency
 * @param {number} amount - Amount to format
 * @param {boolean} showSymbol - Whether to show ₹ symbol
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (amount, showSymbol = true) => {
  if (amount === null || amount === undefined) return showSymbol ? '₹0' : '0';

  const formatter = new Intl.NumberFormat('en-IN', {
    style: showSymbol ? 'currency' : 'decimal',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return formatter.format(amount);
};

/**
 * Format large numbers with K/L/Cr suffixes
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted string with suffix
 */
export const formatCompactCurrency = (amount) => {
  if (amount === null || amount === undefined) return '₹0';

  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)}Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)}L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }

  return `₹${amount.toFixed(0)}`;
};

/**
 * Parse currency string to number
 * @param {string} value - Currency string
 * @returns {number} - Parsed number
 */
export const parseCurrency = (value) => {
  if (!value) return 0;
  return parseFloat(value.toString().replace(/[₹,\s]/g, '')) || 0;
};

/**
 * Format percentage
 * @param {number} value - Percentage value
 * @param {number} decimals - Decimal places
 * @returns {string} - Formatted percentage
 */
export const formatPercentage = (value, decimals = 2) => {
  if (value === null || value === undefined) return '0%';
  return `${value.toFixed(decimals)}%`;
};

export default formatCurrency;
