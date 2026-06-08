import { memo } from 'react';
import { EMPTY_LAST_UPDATED_LABEL } from '../constants';

export const LastUpdatedStatus = memo(function LastUpdatedStatus({ capturedAt, error }) {
  const lastUpdatedLabel = capturedAt
    ? new Date(capturedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    : EMPTY_LAST_UPDATED_LABEL;

  return (
    <div className="flex items-center gap-3">
      {error ? <span className="text-xs font-medium text-red-500">{error}</span> : null}
      <button className="rounded-md border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50">
        อัปเดตล่าสุด: {lastUpdatedLabel}
      </button>
    </div>
  );
});
