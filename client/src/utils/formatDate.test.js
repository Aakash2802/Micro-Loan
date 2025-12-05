// client/src/utils/formatDate.test.js
import { describe, it, expect } from 'vitest';
import { formatDate } from './formatDate';

describe('formatDate', () => {
  it('formats ISO date string correctly', () => {
    const date = '2024-01-15T10:30:00Z';
    const result = formatDate(date);
    expect(result).toContain('2024');
    expect(typeof result).toBe('string');
  });

  it('formats Date object correctly', () => {
    const date = new Date('2024-06-20');
    const result = formatDate(date);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('handles null gracefully', () => {
    const result = formatDate(null);
    expect(result).toBeDefined();
  });

  it('handles undefined gracefully', () => {
    const result = formatDate(undefined);
    expect(result).toBeDefined();
  });

  it('handles invalid date string', () => {
    const result = formatDate('invalid-date');
    expect(result).toBeDefined();
  });
});
