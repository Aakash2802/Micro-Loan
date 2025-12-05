// client/src/components/EmptyState.jsx

const illustrations = {
  // No data
  noData: (
    <svg className="w-full h-full" viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="80" className="fill-gray-100" />
      <rect x="60" y="70" width="80" height="60" rx="8" className="fill-gray-200" />
      <rect x="70" y="85" width="40" height="6" rx="3" className="fill-gray-300" />
      <rect x="70" y="97" width="60" height="6" rx="3" className="fill-gray-300" />
      <rect x="70" y="109" width="30" height="6" rx="3" className="fill-gray-300" />
      <circle cx="140" cy="140" r="30" className="fill-primary-500/10" />
      <path d="M130 140L140 150L155 130" className="stroke-primary-500" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  // Empty inbox/notifications
  inbox: (
    <svg className="w-full h-full" viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="80" className="fill-gray-100" />
      <rect x="50" y="60" width="100" height="80" rx="10" className="fill-gray-200" />
      <path d="M50 80L100 110L150 80" className="stroke-gray-300" strokeWidth="4" fill="none" />
      <circle cx="150" cy="60" r="20" className="fill-primary-500" />
      <text x="150" y="66" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">0</text>
    </svg>
  ),

  // No search results
  search: (
    <svg className="w-full h-full" viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="80" className="fill-gray-100" />
      <circle cx="90" cy="90" r="35" className="stroke-gray-300 fill-gray-200" strokeWidth="6" />
      <line x1="115" y1="115" x2="145" y2="145" className="stroke-gray-300" strokeWidth="6" strokeLinecap="round" />
      <path d="M80 85L100 85" className="stroke-gray-400" strokeWidth="4" strokeLinecap="round" />
      <path d="M75 95L95 95" className="stroke-gray-400" strokeWidth="4" strokeLinecap="round" />
    </svg>
  ),

  // No loans
  loans: (
    <svg className="w-full h-full" viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="80" className="fill-gray-100" />
      <rect x="55" y="50" width="90" height="100" rx="10" className="fill-gray-200" />
      <circle cx="100" cy="85" r="20" className="fill-primary-500/20" />
      <text x="100" y="92" textAnchor="middle" className="fill-primary-500" fontSize="20" fontWeight="bold">₹</text>
      <rect x="70" y="115" width="60" height="8" rx="4" className="fill-gray-300" />
      <rect x="80" y="130" width="40" height="6" rx="3" className="fill-gray-300" />
    </svg>
  ),

  // No customers
  customers: (
    <svg className="w-full h-full" viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="80" className="fill-gray-100" />
      <circle cx="100" cy="80" r="25" className="fill-gray-200" />
      <path d="M60 140C60 115 80 100 100 100C120 100 140 115 140 140" className="fill-gray-200" />
      <circle cx="145" cy="75" r="15" className="fill-primary-500/20" />
      <path d="M140 75H150M145 70V80" className="stroke-primary-500" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),

  // No documents
  documents: (
    <svg className="w-full h-full" viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="80" className="fill-gray-100" />
      <rect x="60" y="45" width="70" height="90" rx="6" className="fill-gray-200" />
      <path d="M110 45V65H130L110 45Z" className="fill-gray-300" />
      <rect x="70" y="75" width="40" height="5" rx="2" className="fill-gray-300" />
      <rect x="70" y="85" width="50" height="5" rx="2" className="fill-gray-300" />
      <rect x="70" y="95" width="35" height="5" rx="2" className="fill-gray-300" />
      <rect x="70" y="110" width="45" height="5" rx="2" className="fill-gray-300" />
      <circle cx="140" cy="130" r="25" className="fill-emerald-500/15" />
      <path d="M130 130L140 140L155 120" className="stroke-emerald-500" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  // No payments
  payments: (
    <svg className="w-full h-full" viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="80" className="fill-gray-100" />
      <rect x="45" y="70" width="110" height="70" rx="10" className="fill-gray-200" />
      <rect x="45" y="85" width="110" height="15" className="fill-gray-300" />
      <rect x="55" y="110" width="40" height="20" rx="4" className="fill-gray-300" />
      <circle cx="140" cy="60" r="25" className="fill-emerald-500/20" />
      <text x="140" y="68" textAnchor="middle" className="fill-emerald-500" fontSize="18" fontWeight="bold">₹</text>
    </svg>
  ),

  // Error state
  error: (
    <svg className="w-full h-full" viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="80" className="fill-red-50" />
      <circle cx="100" cy="100" r="50" className="fill-red-100" />
      <path d="M85 85L115 115M115 85L85 115" className="stroke-red-500" strokeWidth="6" strokeLinecap="round" />
    </svg>
  ),

  // Success state
  success: (
    <svg className="w-full h-full" viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="80" className="fill-emerald-50" />
      <circle cx="100" cy="100" r="50" className="fill-emerald-100" />
      <path d="M75 100L95 120L130 80" className="stroke-emerald-500" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  // Maintenance
  maintenance: (
    <svg className="w-full h-full" viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="80" className="fill-gray-100" />
      <circle cx="100" cy="100" r="40" className="fill-gray-200 stroke-gray-300" strokeWidth="4" />
      <circle cx="100" cy="100" r="15" className="fill-gray-300" />
      <rect x="95" y="40" width="10" height="25" rx="5" className="fill-gray-300" />
      <rect x="95" y="135" width="10" height="25" rx="5" className="fill-gray-300" />
      <rect x="40" y="95" width="25" height="10" rx="5" className="fill-gray-300" />
      <rect x="135" y="95" width="25" height="10" rx="5" className="fill-gray-300" />
      <circle cx="150" cy="55" r="20" className="fill-amber-500/20" />
      <path d="M145 50L150 60L155 50" className="stroke-amber-500" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="150" cy="65" r="2" className="fill-amber-500" />
    </svg>
  ),

  // Auto debit
  autodebit: (
    <svg className="w-full h-full" viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="80" className="fill-gray-100" />
      <rect x="40" y="75" width="90" height="55" rx="8" className="fill-gray-200" />
      <rect x="40" y="88" width="90" height="12" className="fill-gray-300" />
      <circle cx="70" cy="115" r="8" className="fill-gray-300" />
      <rect x="85" y="110" width="35" height="10" rx="3" className="fill-gray-300" />
      <circle cx="150" cy="85" r="30" className="fill-primary-500/15" />
      <path d="M140 85H160M150 75V95" className="stroke-primary-500" strokeWidth="4" strokeLinecap="round" />
    </svg>
  ),
};

const EmptyState = ({
  type = 'noData',
  icon,
  title = 'No data found',
  description = 'There is nothing to display here yet.',
  action,
  actionLabel = 'Get Started',
  className = '',
  size = 'md',
}) => {
  const sizes = {
    sm: 'max-w-xs',
    md: 'max-w-sm',
    lg: 'max-w-md',
  };

  const illustrationSizes = {
    sm: 'w-32 h-32',
    md: 'w-48 h-48',
    lg: 'w-64 h-64',
  };

  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 ${sizes[size]} mx-auto ${className}`}>
      {/* Illustration */}
      <div className={`${illustrationSizes[size]} mb-6 animate-float`}>
        {icon || illustrations[type] || illustrations.noData}
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>

      {/* Description */}
      <p className="text-gray-500 text-sm mb-6">{description}</p>

      {/* Action Button */}
      {action && actionLabel && (
        <button onClick={action} className="btn-primary">
          {actionLabel}
        </button>
      )}
    </div>
  );
};

// Preset empty states for common use cases
export const NoLoansEmpty = ({ action }) => (
  <EmptyState
    type="loans"
    title="No Loans Yet"
    description="You don't have any active loans. Apply for a loan to get started!"
    action={action}
    actionLabel="Apply for Loan"
  />
);

export const NoCustomersEmpty = ({ action }) => (
  <EmptyState
    type="customers"
    title="No Customers Found"
    description="Start by adding your first customer to the system."
    action={action}
    actionLabel="Add Customer"
  />
);

export const NoDocumentsEmpty = ({ action }) => (
  <EmptyState
    type="documents"
    title="No Documents"
    description="Upload documents to keep track of important files."
    action={action}
    actionLabel="Upload Document"
  />
);

export const NoPaymentsEmpty = () => (
  <EmptyState
    type="payments"
    title="No Payment History"
    description="Payment records will appear here once transactions are made."
  />
);

export const NoSearchResultsEmpty = ({ query }) => (
  <EmptyState
    type="search"
    title="No Results Found"
    description={`We couldn't find anything matching "${query}". Try different keywords.`}
  />
);

export const ErrorEmpty = ({ action }) => (
  <EmptyState
    type="error"
    title="Something Went Wrong"
    description="We encountered an error loading this data. Please try again."
    action={action}
    actionLabel="Retry"
  />
);

export const MaintenanceEmpty = () => (
  <EmptyState
    type="maintenance"
    title="Under Maintenance"
    description="We're making some improvements. Please check back soon!"
    size="lg"
  />
);

export const NoAutoDebitEmpty = ({ action }) => (
  <EmptyState
    type="autodebit"
    title="No Auto-Debit Setup"
    description="Set up automatic EMI payments from your bank account."
    action={action}
    actionLabel="Setup Auto-Debit"
  />
);

// Legacy exports for backwards compatibility
export const NoDataFound = ({ onRetry }) => (
  <EmptyState
    type="search"
    title="No data found"
    description="Try adjusting your search or filter criteria"
    action={onRetry}
    actionLabel="Clear filters"
  />
);

export const NoLoans = ({ onAction }) => (
  <EmptyState
    type="loans"
    title="No loans yet"
    description="Create your first loan account to get started"
    action={onAction}
    actionLabel="Create Loan"
  />
);

export const NoCustomers = ({ onAction }) => (
  <EmptyState
    type="customers"
    title="No customers yet"
    description="Add your first customer to start managing loans"
    action={onAction}
    actionLabel="Add Customer"
  />
);

export default EmptyState;
