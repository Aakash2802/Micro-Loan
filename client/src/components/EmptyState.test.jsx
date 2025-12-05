// client/src/components/EmptyState.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../test/utils';
import EmptyState, { NoLoansEmpty, NoCustomersEmpty, ErrorEmpty } from './EmptyState';

describe('EmptyState', () => {
  it('renders default title and description', () => {
    render(<EmptyState />);

    expect(screen.getByText('No data found')).toBeInTheDocument();
    expect(screen.getByText('There is nothing to display here yet.')).toBeInTheDocument();
  });

  it('renders custom title and description', () => {
    render(
      <EmptyState
        title="Custom Title"
        description="Custom description text"
      />
    );

    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('Custom description text')).toBeInTheDocument();
  });

  it('renders action button when provided', () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        action={handleAction}
        actionLabel="Click Me"
      />
    );

    const button = screen.getByText('Click Me');
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('does not render button without action', () => {
    render(<EmptyState actionLabel="Click Me" />);

    expect(screen.queryByText('Click Me')).not.toBeInTheDocument();
  });
});

describe('NoLoansEmpty', () => {
  it('renders no loans message', () => {
    render(<NoLoansEmpty />);

    expect(screen.getByText('No Loans Yet')).toBeInTheDocument();
  });

  it('calls action when button clicked', () => {
    const handleAction = vi.fn();
    render(<NoLoansEmpty action={handleAction} />);

    const button = screen.getByText('Apply for Loan');
    fireEvent.click(button);

    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});

describe('NoCustomersEmpty', () => {
  it('renders no customers message', () => {
    render(<NoCustomersEmpty />);

    expect(screen.getByText('No Customers Found')).toBeInTheDocument();
  });
});

describe('ErrorEmpty', () => {
  it('renders error state', () => {
    render(<ErrorEmpty />);

    expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
  });

  it('calls retry action', () => {
    const handleRetry = vi.fn();
    render(<ErrorEmpty action={handleRetry} />);

    const button = screen.getByText('Retry');
    fireEvent.click(button);

    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});
