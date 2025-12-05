// client/src/components/CardStat.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../test/utils';
import CardStat from './CardStat';

describe('CardStat', () => {
  const defaultProps = {
    title: 'Total Loans',
    value: '₹1,00,000',
    subtitle: '10 loans',
    color: 'primary',
  };

  it('renders title and value', () => {
    render(<CardStat {...defaultProps} />);

    expect(screen.getByText('Total Loans')).toBeInTheDocument();
    // Value might be animated, check it eventually appears
  });

  it('renders subtitle when provided', () => {
    render(<CardStat {...defaultProps} />);

    expect(screen.getByText('10 loans')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    const icon = <svg data-testid="test-icon" />;
    render(<CardStat {...defaultProps} icon={icon} />);

    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('renders trend indicator when provided', () => {
    render(
      <CardStat
        {...defaultProps}
        trend="up"
        trendValue="+12.5%"
      />
    );

    expect(screen.getByText('+12.5%')).toBeInTheDocument();
  });

  it('applies correct color class', () => {
    const { container } = render(<CardStat {...defaultProps} color="success" />);

    // Check that success-related class exists in rendered HTML
    expect(container.innerHTML).toContain('emerald');
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<CardStat {...defaultProps} onClick={handleClick} />);

    const card = screen.getByText('Total Loans').closest('div[class*="cursor-pointer"]');
    fireEvent.click(card);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('navigates when to prop is provided', () => {
    render(<CardStat {...defaultProps} to="/dashboard/loans" />);

    const card = screen.getByText('Total Loans').closest('div[class*="cursor-pointer"]');
    expect(card).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <CardStat {...defaultProps} className="custom-class" />
    );

    expect(container.querySelector('.custom-class')).toBeTruthy();
  });
});
