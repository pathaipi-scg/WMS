import { memo } from 'react';
import { QUEUE_STATUSES } from '@/features/queue/constants';
import { normalizeStatus } from '@/features/queue/utils/queueTransforms';
import { StatusBadge } from '@/shared/components/StatusBadge';


const STATUS_COLORS = {
  [QUEUE_STATUSES.loading]: 'bg-blue-100 text-blue-800',
  [QUEUE_STATUSES.waiting]: 'bg-yellow-100 text-yellow-800',
};

export const QueueStatusBadge = memo(function QueueStatusBadge({ status, size = 'sm' }) {
  const normalizedStatus = normalizeStatus(status);
  return (
    <StatusBadge
      label={normalizedStatus || '-'}
      colorClass={STATUS_COLORS[normalizedStatus]}
      size={size}
    />
  );
});
