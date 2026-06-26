import { memo } from 'react';
import { QUEUE_STATUSES } from '@/features/queue/constants';
import { normalizeStatus } from '@/features/queue/utils/queueTransforms';
import { StatusBadge } from '@/shared/components/StatusBadge';


const STATUS_COLORS = {
  [QUEUE_STATUSES.queued]: 'bg-slate-100 text-slate-700',
  [QUEUE_STATUSES.waitingCall]: 'bg-yellow-100 text-yellow-800',
  [QUEUE_STATUSES.waitingLoad]: 'bg-amber-100 text-amber-800',
  [QUEUE_STATUSES.loading]: 'bg-blue-100 text-blue-800',
  [QUEUE_STATUSES.waitingClose]: 'bg-indigo-100 text-indigo-800',
  [QUEUE_STATUSES.waitingPosting]: 'bg-purple-100 text-purple-800',
  [QUEUE_STATUSES.done]: 'bg-emerald-100 text-emerald-800',
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
