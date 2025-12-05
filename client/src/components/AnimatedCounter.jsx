// client/src/components/AnimatedCounter.jsx
import useCounter, { formatters } from '../hooks/useCounter';

const AnimatedCounter = ({
  value,
  duration = 1000,
  delay = 0,
  decimals = 0,
  prefix = '',
  suffix = '',
  format = 'default', // 'default', 'currency', 'currencyLakh', 'currencyCrore', 'percentage', 'compact'
  className = '',
  onComplete,
}) => {
  const formatter = format !== 'default' ? formatters[format] : undefined;

  const { formattedValue, ref, isAnimating } = useCounter(value, {
    duration,
    delay,
    decimals,
    prefix,
    suffix,
    formatter,
    startOnView: true,
    easing: 'easeOut',
  });

  return (
    <span
      ref={ref}
      className={`counter-animate ${className}`}
      data-animating={isAnimating}
    >
      {formattedValue}
    </span>
  );
};

// Preset counter components
export const CurrencyCounter = ({ value, ...props }) => (
  <AnimatedCounter value={value} format="currency" {...props} />
);

export const PercentageCounter = ({ value, ...props }) => (
  <AnimatedCounter value={value} format="percentage" decimals={1} {...props} />
);

export const CompactCurrencyCounter = ({ value, ...props }) => (
  <AnimatedCounter value={value} format="compact" {...props} />
);

export const NumberCounter = ({ value, ...props }) => (
  <AnimatedCounter value={value} {...props} />
);

export default AnimatedCounter;
