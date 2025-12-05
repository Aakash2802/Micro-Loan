// client/src/components/Badge.jsx

const Badge = ({ children, variant = 'gray', size = 'md', dot = false, className = '' }) => {
  const variants = {
    gray: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    primary: 'bg-primary-100 text-primary-800',
    purple: 'bg-purple-100 text-purple-800',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  };

  const dotColors = {
    gray: 'bg-gray-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
    info: 'bg-blue-500',
    primary: 'bg-primary-500',
    purple: 'bg-purple-500',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};

// Status badge helper
export const StatusBadge = ({ status }) => {
  const statusConfig = {
    // Loan statuses
    pending: { variant: 'warning', label: 'Pending' },
    approved: { variant: 'info', label: 'Approved' },
    active: { variant: 'success', label: 'Active' },
    overdue: { variant: 'danger', label: 'Overdue' },
    closed: { variant: 'gray', label: 'Closed' },
    rejected: { variant: 'danger', label: 'Rejected' },

    // EMI statuses
    paid: { variant: 'success', label: 'Paid' },
    partial: { variant: 'warning', label: 'Partial' },

    // KYC statuses
    verified: { variant: 'success', label: 'Verified' },
    unverified: { variant: 'warning', label: 'Unverified' },

    // Generic
    true: { variant: 'success', label: 'Yes' },
    false: { variant: 'danger', label: 'No' },
  };

  const config = statusConfig[status] || { variant: 'gray', label: status };

  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>
  );
};

export default Badge;
