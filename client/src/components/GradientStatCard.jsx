// client/src/components/GradientStatCard.jsx
import { useEffect, useState, useRef } from 'react';

const GradientStatCard = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  variant = 'primary',
  className = '',
  animate = true,
}) => {
  const [displayValue, setDisplayValue] = useState(animate ? 0 : value);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);

  const variants = {
    primary: 'gradient-card-primary',
    success: 'gradient-card-success',
    warning: 'gradient-card-warning',
    danger: 'gradient-card-danger',
    info: 'gradient-card-info',
    purple: 'gradient-card-purple',
  };

  // Intersection observer for animation trigger
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Animate number counting
  useEffect(() => {
    if (!animate || !isVisible) return;

    const numericValue = typeof value === 'number' ? value : parseFloat(value?.toString().replace(/[^0-9.-]/g, '')) || 0;
    const duration = 1000;
    const steps = 30;
    const stepValue = numericValue / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(stepValue * step, numericValue);
      setDisplayValue(current);

      if (step >= steps) {
        clearInterval(timer);
        setDisplayValue(numericValue);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value, animate, isVisible]);

  // Format the display value
  const formatValue = (val) => {
    if (typeof value === 'string') {
      // If original value has currency symbol, format with it
      if (value.includes('₹')) {
        return `₹${Math.round(val).toLocaleString('en-IN')}`;
      }
      if (value.includes('%')) {
        return `${val.toFixed(1)}%`;
      }
      if (value.includes('Cr')) {
        return `₹${val.toFixed(1)}Cr`;
      }
      if (value.includes('L')) {
        return `₹${val.toFixed(1)}L`;
      }
    }
    if (typeof value === 'number') {
      return Math.round(val).toLocaleString('en-IN');
    }
    return value;
  };

  const getTrendIcon = () => {
    if (trend === 'up') {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      );
    }
    if (trend === 'down') {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      );
    }
    return null;
  };

  return (
    <div
      ref={cardRef}
      className={`${variants[variant]} ${className} ${isVisible ? 'animate-fade-in' : 'opacity-0'}`}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          {/* Icon */}
          {icon && (
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              {icon}
            </div>
          )}

          {/* Trend */}
          {trend && trendValue && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
              trend === 'up' ? 'bg-white/20 text-white' : 'bg-black/10 text-white/80'
            }`}>
              {getTrendIcon()}
              {trendValue}
            </div>
          )}
        </div>

        {/* Value */}
        <div className="text-3xl font-bold mb-1 tracking-tight">
          {animate ? formatValue(displayValue) : value}
        </div>

        {/* Title */}
        <div className="text-sm font-medium text-white/80">{title}</div>

        {/* Subtitle */}
        {subtitle && (
          <div className="text-xs text-white/60 mt-2">{subtitle}</div>
        )}
      </div>
    </div>
  );
};

// Preset stat cards
export const TotalLoansCard = ({ value, trend, trendValue }) => (
  <GradientStatCard
    title="Total Loans"
    value={value}
    icon={
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    }
    trend={trend}
    trendValue={trendValue}
    variant="primary"
  />
);

export const TotalDisbursedCard = ({ value, trend, trendValue }) => (
  <GradientStatCard
    title="Total Disbursed"
    value={value}
    icon={
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    }
    trend={trend}
    trendValue={trendValue}
    variant="success"
  />
);

export const CollectionCard = ({ value, trend, trendValue }) => (
  <GradientStatCard
    title="Collections"
    value={value}
    icon={
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    }
    trend={trend}
    trendValue={trendValue}
    variant="info"
  />
);

export const OverdueCard = ({ value, trend, trendValue }) => (
  <GradientStatCard
    title="Overdue Amount"
    value={value}
    icon={
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    }
    trend={trend}
    trendValue={trendValue}
    variant="danger"
  />
);

export const CustomersCard = ({ value, trend, trendValue }) => (
  <GradientStatCard
    title="Total Customers"
    value={value}
    icon={
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    }
    trend={trend}
    trendValue={trendValue}
    variant="purple"
  />
);

export default GradientStatCard;
