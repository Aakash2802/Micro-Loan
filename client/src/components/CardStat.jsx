// client/src/components/CardStat.jsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const CardStat = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  color = 'primary',
  className = '',
  delay = 0,
  to,
  onClick,
}) => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [displayValue, setDisplayValue] = useState(0);
  const cardRef = useRef(null);

  const colorConfig = {
    primary: {
      bg: 'bg-gradient-to-br from-primary-500 to-primary-600',
      iconBg: 'bg-primary-100',
      iconText: 'text-primary-600',
      glow: 'shadow-primary-500/20',
      light: 'bg-primary-500/10',
    },
    success: {
      bg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      iconBg: 'bg-emerald-100',
      iconText: 'text-emerald-600',
      glow: 'shadow-emerald-500/20',
      light: 'bg-emerald-500/10',
    },
    warning: {
      bg: 'bg-gradient-to-br from-amber-500 to-amber-600',
      iconBg: 'bg-amber-100',
      iconText: 'text-amber-600',
      glow: 'shadow-amber-500/20',
      light: 'bg-amber-500/10',
    },
    danger: {
      bg: 'bg-gradient-to-br from-red-500 to-red-600',
      iconBg: 'bg-red-100',
      iconText: 'text-red-600',
      glow: 'shadow-red-500/20',
      light: 'bg-red-500/10',
    },
    purple: {
      bg: 'bg-gradient-to-br from-purple-500 to-purple-600',
      iconBg: 'bg-purple-100',
      iconText: 'text-purple-600',
      glow: 'shadow-purple-500/20',
      light: 'bg-purple-500/10',
    },
    blue: {
      bg: 'bg-gradient-to-br from-blue-500 to-blue-600',
      iconBg: 'bg-blue-100',
      iconText: 'text-blue-600',
      glow: 'shadow-blue-500/20',
      light: 'bg-blue-500/10',
    },
  };

  const colors = colorConfig[color] || colorConfig.primary;

  // Intersection Observer for animation on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  // Animate number counting
  useEffect(() => {
    if (!isVisible) return;

    const numericValue = typeof value === 'string'
      ? parseFloat(value.replace(/[^0-9.-]+/g, ''))
      : value;

    if (isNaN(numericValue)) {
      setDisplayValue(value);
      return;
    }

    const duration = 1500;
    const steps = 60;
    const stepValue = numericValue / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(stepValue * step, numericValue);

      // Format the display value to match the original format
      if (typeof value === 'string') {
        if (value.includes('₹')) {
          setDisplayValue(`₹${Math.round(current).toLocaleString('en-IN')}`);
        } else if (value.includes('%')) {
          setDisplayValue(`${current.toFixed(1)}%`);
        } else {
          setDisplayValue(Math.round(current).toLocaleString('en-IN'));
        }
      } else {
        setDisplayValue(Math.round(current));
      }

      if (step >= steps) {
        clearInterval(timer);
        setDisplayValue(value);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [isVisible, value]);

  return (
    <div
      ref={cardRef}
      className={`
        relative overflow-hidden rounded-2xl bg-white p-6
        border border-gray-100
        transition-all duration-500 ease-out
        hover:shadow-xl hover:-translate-y-1 ${colors.glow}
        group cursor-pointer
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
        ${className}
      `}
      style={{ transitionDelay: `${delay}ms` }}
      onClick={() => {
        if (onClick) onClick();
        else if (to) navigate(to);
      }}
    >
      {/* Background decoration */}
      <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full ${colors.light} transition-transform duration-500 group-hover:scale-150 pointer-events-none`} />
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${colors.light} opacity-50 transition-transform duration-700 group-hover:scale-150 pointer-events-none`} />

      <div className="relative z-10 flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
          <p className={`mt-3 text-3xl font-bold text-gray-900 transition-all duration-300 ${isVisible ? 'animate-fade-in' : ''}`}>
            {displayValue}
          </p>
          {subtitle && (
            <p className="mt-2 text-sm text-gray-500">{subtitle}</p>
          )}
          {trend && trendValue && (
            <div className={`mt-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
              ${trend === 'up' ? 'bg-emerald-100 text-emerald-700' : ''}
              ${trend === 'down' ? 'bg-red-100 text-red-700' : ''}
              ${trend === 'neutral' ? 'bg-gray-100 text-gray-700' : ''}
            `}>
              {trend === 'up' && (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              )}
              {trend === 'down' && (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`
            w-14 h-14 rounded-2xl flex items-center justify-center
            ${colors.iconBg} ${colors.iconText}
            transition-all duration-500
            group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-lg
          `}>
            {icon}
          </div>
        )}
      </div>

      {/* Bottom gradient line */}
      <div className={`absolute bottom-0 left-0 right-0 h-1 ${colors.bg} transform origin-left transition-transform duration-500 scale-x-0 group-hover:scale-x-100 pointer-events-none`} />
    </div>
  );
};

export default CardStat;
