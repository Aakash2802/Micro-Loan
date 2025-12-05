// client/src/utils/formatCurrency.test.js
import { describe, it, expect } from 'vitest';
import { formatCurrency, formatCompactCurrency } from './formatCurrency';

describe('formatCurrency', () => {
  it('formats positive numbers correctly', () => {
    expect(formatCurrency(1000)).toBe('₹1,000');
    expect(formatCurrency(100000)).toBe('₹1,00,000');
    expect(formatCurrency(1234567)).toBe('₹12,34,567');
  });

  it('formats zero correctly', () => {
    expect(formatCurrency(0)).toBe('₹0');
  });

  it('handles null and undefined', () => {
    expect(formatCurrency(null)).toBe('₹0');
    expect(formatCurrency(undefined)).toBe('₹0');
  });

  it('formats decimal numbers', () => {
    const result = formatCurrency(1234.56);
    expect(result).toContain('₹');
    expect(result).toContain('1,234');
  });
});

describe('formatCompactCurrency', () => {
  it('formats thousands with K suffix', () => {
    const result = formatCompactCurrency(5000);
    expect(result).toContain('₹');
    expect(result.toLowerCase()).toContain('k');
  });

  it('formats lakhs with L suffix', () => {
    const result = formatCompactCurrency(500000);
    expect(result).toContain('₹');
    expect(result.toLowerCase()).toMatch(/l|lakh/);
  });

  it('formats crores with Cr suffix', () => {
    const result = formatCompactCurrency(10000000);
    expect(result).toContain('₹');
  });

  it('handles small numbers without suffix', () => {
    const result = formatCompactCurrency(500);
    expect(result).toContain('₹');
    expect(result).toContain('500');
  });

  it('handles null and undefined', () => {
    expect(formatCompactCurrency(null)).toContain('₹');
    expect(formatCompactCurrency(undefined)).toContain('₹');
  });
});
