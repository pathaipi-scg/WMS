import { memo } from 'react';
import { QUEUE_STATUSES } from '../../constants/queue';
import { normalizeStatus } from '../../utils/queue/queueTransforms';

const SIZE_STYLES = {
  sm: 'px-3 py-1 text-[11px]',
  lg: 'px-4 py-1.5 text-sm',
};

const STATUS_STYLES = {
  [QUEUE_STATUSES.loading]: 'bg-blue-100 text-blue-700',
  [QUEUE_STATUSES.waiting]: 'bg-yellow-100 text-yellow-700',
};

// คอมโพเนนต์แสดงสถานะของคิวรถด้วย badge ที่มีสีและขนาดปรับได้ตามสถานะและขนาดที่กำหนด
export const QueueStatusBadge = memo(function QueueStatusBadge({ status, size = 'sm' }) {
  const normalizedStatus = normalizeStatus(status);
  const sizeClassName = SIZE_STYLES[size] ?? SIZE_STYLES.sm;
  const statusClassName = STATUS_STYLES[normalizedStatus];

  if (!statusClassName) {
    return <span>{normalizedStatus || '-'}</span>;
  }

  return (
    <span className={`rounded-full font-bold ${sizeClassName} ${statusClassName}`}>
      {normalizedStatus}
    </span>
  );
});
