// client/src/components/Skeleton.jsx
const Skeleton = ({ className = '', variant = 'text', count = 1 }) => {
  const baseClass = 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]';

  const variants = {
    text: 'h-4 rounded',
    title: 'h-6 rounded',
    avatar: 'w-12 h-12 rounded-full',
    thumbnail: 'w-16 h-16 rounded-xl',
    button: 'h-10 rounded-xl',
    card: 'h-32 rounded-2xl',
    stat: 'h-24 rounded-2xl',
    table: 'h-12 rounded',
    input: 'h-12 rounded-xl',
  };

  const elements = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={`${baseClass} ${variants[variant] || variants.text} ${className}`}
      style={{ animationDuration: '1.5s' }}
    />
  ));

  return count === 1 ? elements[0] : <>{elements}</>;
};

// Skeleton for stat cards
export const StatCardSkeleton = () => (
  <div className="card p-6 space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton variant="avatar" className="w-14 h-14 rounded-2xl" />
      <Skeleton className="w-16 h-6" />
    </div>
    <div className="space-y-2">
      <Skeleton className="w-24 h-8" />
      <Skeleton className="w-32 h-4" />
    </div>
  </div>
);

// Skeleton for table rows
export const TableRowSkeleton = ({ columns = 5 }) => (
  <tr className="border-b border-gray-100">
    {Array.from({ length: columns }, (_, i) => (
      <td key={i} className="px-4 py-4">
        <Skeleton className={i === 0 ? 'w-32' : i === columns - 1 ? 'w-20' : 'w-24'} />
      </td>
    ))}
  </tr>
);

// Skeleton for loan cards
export const LoanCardSkeleton = () => (
  <div className="card p-5 space-y-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton variant="avatar" />
        <div className="space-y-2">
          <Skeleton className="w-28 h-5" />
          <Skeleton className="w-40 h-4" />
        </div>
      </div>
      <Skeleton className="w-20 h-7 rounded-lg" />
    </div>
    <div className="grid grid-cols-3 gap-4">
      <Skeleton variant="stat" className="h-16" />
      <Skeleton variant="stat" className="h-16" />
      <Skeleton variant="stat" className="h-16" />
    </div>
    <div className="space-y-2">
      <div className="flex justify-between">
        <Skeleton className="w-24 h-3" />
        <Skeleton className="w-12 h-3" />
      </div>
      <Skeleton className="h-2.5 rounded-full" />
    </div>
  </div>
);

// Skeleton for list items
export const ListItemSkeleton = () => (
  <div className="flex items-center gap-4 p-4 border-b border-gray-100">
    <Skeleton variant="avatar" />
    <div className="flex-1 space-y-2">
      <Skeleton className="w-1/3 h-5" />
      <Skeleton className="w-1/2 h-4" />
    </div>
    <Skeleton className="w-24 h-8 rounded-lg" />
  </div>
);

// Skeleton for dashboard
export const DashboardSkeleton = () => (
  <div className="space-y-6 animate-fade-in">
    {/* Stats */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
    </div>
    {/* Content */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 card p-6 space-y-4">
        <Skeleton className="w-40 h-6" />
        <div className="space-y-3">
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
        </div>
      </div>
      <div className="card p-6 space-y-4">
        <Skeleton className="w-32 h-6" />
        <Skeleton variant="card" className="h-48" />
      </div>
    </div>
  </div>
);

export default Skeleton;
