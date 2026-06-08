import { memo } from 'react';
import { EMPTY_LAST_UPDATED_LABEL } from '../../constants/dashboard';
import { useLiveClock } from '../../hooks/common/useLiveClock';
import { formatRelativeTime } from '../../utils/common/dateTime';
//  component สำหรับแสดงสถานะการอัปเดตล่าสุดของข้อมูลบนแดชบอร์ด

export const LastUpdatedStatus = memo(function LastUpdatedStatus({ capturedAt, error }) {
  const now = useLiveClock();
  const lastUpdatedLabel = capturedAt
    ? formatRelativeTime(capturedAt, now)
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
