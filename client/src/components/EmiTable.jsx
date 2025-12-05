// client/src/components/EmiTable.jsx
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate, formatDueDate } from '../utils/formatDate';

const EmiTable = ({ emis, onPayEmi, showActions = false }) => {
  const getStatusBadge = (status) => {
    const badges = {
      paid: 'badge-success',
      pending: 'badge-info',
      overdue: 'badge-danger',
      partial: 'badge-warning',
      waived: 'badge-gray',
    };
    return badges[status] || 'badge-gray';
  };

  const getStatusLabel = (status) => {
    const labels = {
      paid: 'Paid',
      pending: 'Pending',
      overdue: 'Overdue',
      partial: 'Partial',
      waived: 'Waived',
    };
    return labels[status] || status;
  };

  if (!emis || emis.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No EMI schedule available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>EMI #</th>
            <th>Due Date</th>
            <th>EMI Amount</th>
            <th>Principal</th>
            <th>Interest</th>
            <th>Status</th>
            <th>Paid Date</th>
            {showActions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {emis.map((emi) => {
            const dueInfo = formatDueDate(emi.dueDate);
            const date = new Date(emi.dueDate);
            const day = date.getDate();
            const month = date.toLocaleDateString('en-US', { month: 'short' });
            const year = date.getFullYear();
            const statusColors = {
              paid: 'bg-emerald-50 border-emerald-200',
              pending: 'bg-blue-50 border-blue-200',
              overdue: 'bg-red-50 border-red-200',
              partial: 'bg-amber-50 border-amber-200',
              waived: 'bg-gray-50 border-gray-200'
            };
            const textColors = {
              paid: 'text-emerald-600',
              pending: 'text-blue-600',
              overdue: 'text-red-600',
              partial: 'text-amber-600',
              waived: 'text-gray-600'
            };
            return (
              <tr key={emi._id || emi.sequence}>
                <td className="font-medium">{emi.sequence}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className={`text-center px-2 py-1.5 rounded-lg border ${statusColors[emi.status] || statusColors.pending}`}>
                      <p className={`text-[10px] font-semibold uppercase ${textColors[emi.status] || textColors.pending}`}>{month}</p>
                      <p className={`text-lg font-bold ${emi.status === 'overdue' ? 'text-red-700' : 'text-gray-900'}`}>{day}</p>
                      <p className="text-[10px] text-gray-500">{year}</p>
                    </div>
                    {emi.status === 'overdue' && (
                      <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded">
                        {Math.abs(dueInfo.daysLeft)}d late
                      </span>
                    )}
                  </div>
                </td>
                <td className="font-medium">{formatCurrency(emi.amount)}</td>
                <td>{formatCurrency(emi.principalComponent)}</td>
                <td>{formatCurrency(emi.interestComponent)}</td>
                <td>
                  <span className={getStatusBadge(emi.status)}>
                    {getStatusLabel(emi.status)}
                  </span>
                  {emi.penaltyAmount > 0 && (
                    <span className="block text-xs text-red-500 mt-1">
                      +{formatCurrency(emi.penaltyAmount)} penalty
                    </span>
                  )}
                </td>
                <td>
                  {emi.paidDate ? formatDate(emi.paidDate) : '-'}
                  {emi.paidAmount > 0 && (
                    <span className="block text-xs text-gray-500">
                      {formatCurrency(emi.paidAmount)}
                    </span>
                  )}
                </td>
                {showActions && (
                  <td>
                    {['pending', 'overdue', 'partial'].includes(emi.status) && (
                      <button
                        onClick={() => onPayEmi && onPayEmi(emi)}
                        className="btn-primary text-xs px-3 py-1"
                      >
                        Pay
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default EmiTable;
