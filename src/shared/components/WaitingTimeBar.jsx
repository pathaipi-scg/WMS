import { memo } from 'react';
import { getWaitingTimeMinutes, getWaitingTimeProgressColor, getWaitingTimeProgressWidth, getWaitingTimeTextColor,} from '@/features/dashboard/utils/waitingTimeStyles';

// คอมโพเนนต์แสดงแถบเวลารอคิวที่มีสีและความกว้างของแถบเปลี่ยนตามเวลารอคิว
export const WaitingTimeBar = memo(function WaitingTimeBar({
  value,
  variant = 'table',
  showValue = variant === 'table',
  showUnit = false,
  className = '',
}) {
  const waitingTime = getWaitingTimeMinutes(value);
  const isCompact = variant === 'compact';

  const containerClassName = isCompact
    ? 'flex items-center gap-3'
    : 'flex h-full items-center gap-3';

  const trackClassName = isCompact
    ? 'h-1.5 w-full flex-1 overflow-hidden rounded-full bg-slate-200'
    : 'h-5 w-full flex-1 overflow-hidden rounded-sm bg-gray-100';

  const fillClassName = isCompact
    ? `h-full rounded-full ${getWaitingTimeProgressColor(waitingTime)}`
    : `h-full rounded-sm ${getWaitingTimeProgressColor(waitingTime)}`;
  
  const textClassName = isCompact
    ? `shrink-0 text-[12px] font-bold ${getWaitingTimeTextColor(waitingTime)}`
    : `shrink-0 text-right font-bold ${getWaitingTimeTextColor(waitingTime)}`;

  return (
    <div className={`${containerClassName} ${className}`.trim()}>
      <div className={trackClassName}>
        <div
          className={fillClassName}
          style={{ width: getWaitingTimeProgressWidth(waitingTime) }}
        />
      </div>
      {showValue ? (
        <span className={textClassName}>
          {waitingTime}
          {showUnit ? ' นาที' : ''}
        </span>
      ) : null}
    </div>
  );
});
