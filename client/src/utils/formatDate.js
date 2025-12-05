// client/src/utils/formatDate.js
import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';

/**
 * Parse date string to Date object
 * @param {string|Date} date - Date to parse
 * @returns {Date|null} - Parsed date or null
 */
const parseDate = (date) => {
  if (!date) return null;
  if (date instanceof Date) return isValid(date) ? date : null;
  const parsed = parseISO(date);
  return isValid(parsed) ? parsed : null;
};

/**
 * Format date to display format
 * @param {string|Date} date - Date to format
 * @param {string} formatStr - Format string (default: 'dd MMM yyyy')
 * @returns {string} - Formatted date string
 */
export const formatDate = (date, formatStr = 'dd MMM yyyy') => {
  const parsed = parseDate(date);
  if (!parsed) return '-';
  return format(parsed, formatStr);
};

/**
 * Format date with time
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted datetime string
 */
export const formatDateTime = (date) => {
  const parsed = parseDate(date);
  if (!parsed) return '-';
  return format(parsed, 'dd MMM yyyy, hh:mm a');
};

/**
 * Format date for input fields (yyyy-MM-dd)
 * @param {string|Date} date - Date to format
 * @returns {string} - Date string for input
 */
export const formatDateForInput = (date) => {
  const parsed = parseDate(date);
  if (!parsed) return '';
  return format(parsed, 'yyyy-MM-dd');
};

/**
 * Get relative time (e.g., "2 days ago")
 * @param {string|Date} date - Date to format
 * @returns {string} - Relative time string
 */
export const formatRelativeTime = (date) => {
  const parsed = parseDate(date);
  if (!parsed) return '-';
  return formatDistanceToNow(parsed, { addSuffix: true });
};

/**
 * Format month and year
 * @param {string|Date} date - Date to format
 * @returns {string} - Month year string
 */
export const formatMonthYear = (date) => {
  const parsed = parseDate(date);
  if (!parsed) return '-';
  return format(parsed, 'MMMM yyyy');
};

/**
 * Check if date is in the past
 * @param {string|Date} date - Date to check
 * @returns {boolean}
 */
export const isDatePast = (date) => {
  const parsed = parseDate(date);
  if (!parsed) return false;
  return parsed < new Date();
};

/**
 * Get days difference from today
 * @param {string|Date} date - Date to compare
 * @returns {number} - Days difference (negative if past)
 */
export const getDaysDifference = (date) => {
  const parsed = parseDate(date);
  if (!parsed) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);
  const diffTime = parsed - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Format due date with status
 * @param {string|Date} date - Due date
 * @returns {object} - { text, className, daysLeft }
 */
export const formatDueDate = (date) => {
  const parsed = parseDate(date);
  if (!parsed) return { text: '-', className: '', daysLeft: 0 };

  const days = getDaysDifference(parsed);
  const formattedDate = format(parsed, 'dd MMM yyyy');

  if (days < 0) {
    return {
      text: `${formattedDate} (${Math.abs(days)} days overdue)`,
      className: 'text-red-600',
      daysLeft: days,
    };
  }
  if (days === 0) {
    return {
      text: `${formattedDate} (Due today)`,
      className: 'text-orange-600',
      daysLeft: 0,
    };
  }
  if (days <= 7) {
    return {
      text: `${formattedDate} (${days} days left)`,
      className: 'text-yellow-600',
      daysLeft: days,
    };
  }
  return {
    text: formattedDate,
    className: 'text-gray-700',
    daysLeft: days,
  };
};

export default formatDate;
