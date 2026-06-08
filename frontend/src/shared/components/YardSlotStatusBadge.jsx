import { memo } from 'react';
import { YARD_STATUSES } from '@/features/yard/constants';
import { normalizeYardSlotStatus } from '@/features/yard/utils/yardTransforms';
import { StatusBadge } from './StatusBadge';

const STATUS_COLORS = {
  [YARD_STATUSES.loading]: 'bg-blue-100 text-blue-700',
  [YARD_STATUSES.completed]: 'bg-emerald-100 text-emerald-700',
  [YARD_STATUSES.available]: 'bg-green-100 text-green-700',
};

export const YardSlotStatusBadge = memo(function YardSlotStatusBadge({ status, label, size = 'sm' }) {
  const normalizedStatus = normalizeYardSlotStatus(status, label);
  return (
    <StatusBadge
      label={String(label ?? '').trim() || '-'}
      colorClass={STATUS_COLORS[normalizedStatus]}
      size={size}
    />
  );
});
