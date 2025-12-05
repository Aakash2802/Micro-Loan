// client/src/hooks/useCounter.js
import { useState, useEffect, useRef } from 'react';

/**
 * Hook for animated number counting
 * @param {number} end - Target number to count to
 * @param {object} options - Configuration options
 * @param {number} options.duration - Animation duration in ms (default: 1000)
 * @param {number} options.delay - Delay before starting in ms (default: 0)
 * @param {boolean} options.startOnView - Start when element is in viewport (default: true)
 * @param {string} options.easing - Easing function: 'linear', 'easeOut', 'easeInOut' (default: 'easeOut')
 * @param {number} options.decimals - Number of decimal places (default: 0)
 * @param {string} options.prefix - Prefix string (default: '')
 * @param {string} options.suffix - Suffix string (default: '')
 * @param {function} options.formatter - Custom formatter function
 */
const useCounter = (end, options = {}) => {
  const {
    duration = 1000,
    delay = 0,
    startOnView = true,
    easing = 'easeOut',
    decimals = 0,
    prefix = '',
    suffix = '',
    formatter,
  } = options;

  const [count, setCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef(null);
  const frameRef = useRef(null);
  const startTimeRef = useRef(null);

  // Easing functions
  const easingFunctions = {
    linear: (t) => t,
    easeOut: (t) => 1 - Math.pow(1 - t, 3),
    easeInOut: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  };

  const animate = (timestamp) => {
    if (!startTimeRef.current) {
      startTimeRef.current = timestamp;
    }

    const elapsed = timestamp - startTimeRef.current;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easingFunctions[easing](progress);
    const currentValue = easedProgress * end;

    setCount(currentValue);

    if (progress < 1) {
      frameRef.current = requestAnimationFrame(animate);
    } else {
      setCount(end);
      setIsAnimating(false);
      setHasAnimated(true);
    }
  };

  const startAnimation = () => {
    if (isAnimating || hasAnimated) return;

    setIsAnimating(true);
    startTimeRef.current = null;

    setTimeout(() => {
      frameRef.current = requestAnimationFrame(animate);
    }, delay);
  };

  const reset = () => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
    setCount(0);
    setIsAnimating(false);
    setHasAnimated(false);
    startTimeRef.current = null;
  };

  // Intersection observer for startOnView
  useEffect(() => {
    if (!startOnView) {
      startAnimation();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          startAnimation();
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      observer.disconnect();
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [startOnView, hasAnimated, end]);

  // Format the count value
  const formattedValue = () => {
    if (formatter) {
      return formatter(count);
    }

    const fixedValue = count.toFixed(decimals);
    const formattedNumber = decimals === 0
      ? Math.round(count).toLocaleString('en-IN')
      : parseFloat(fixedValue).toLocaleString('en-IN', { minimumFractionDigits: decimals });

    return `${prefix}${formattedNumber}${suffix}`;
  };

  return {
    count,
    formattedValue: formattedValue(),
    ref: elementRef,
    isAnimating,
    hasAnimated,
    reset,
    startAnimation,
  };
};

export default useCounter;

// Preset formatters
export const formatters = {
  currency: (value) => `₹${Math.round(value).toLocaleString('en-IN')}`,
  currencyLakh: (value) => `₹${(value / 100000).toFixed(2)}L`,
  currencyCrore: (value) => `₹${(value / 10000000).toFixed(2)}Cr`,
  percentage: (value) => `${value.toFixed(1)}%`,
  compact: (value) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${Math.round(value).toLocaleString('en-IN')}`;
  },
};
