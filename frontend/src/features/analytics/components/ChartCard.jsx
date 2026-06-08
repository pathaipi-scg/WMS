import { memo } from 'react';
import { AlertCircle } from 'lucide-react';

export const ChartCard = memo(function ChartCard({
  title,
  subtitle,
  action,
  loading = false,
  error = null,
  height = 280,
  children,
  className = '',
}) {
  return (
    <div className={`flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}>
      {/* Card header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">{title}</p>
          {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
        </div>
        {action && <div className="ml-4 shrink-0">{action}</div>}
      </div>

      {/* Card body */}
      <div className="flex-1 px-5 pb-5">
        {error ? (
          <div
            className="flex items-center justify-center gap-2 rounded-lg border border-red-100 bg-red-50 text-sm text-red-500"
            style={{ height }}
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : loading ? (
          <div
            className="animate-pulse rounded-lg bg-gray-100"
            style={{ height }}
          />
        ) : (
          <div style={{ height }}>{children}</div>
        )}
      </div>
    </div>
  );
});
