import { memo } from 'react';
import { YARD_STATUSES } from '@/features/yard/constants';
import { normalizeYardSlotStatus } from '@/features/yard/utils/yardTransforms';
import { StatusBadge } from '@/shared/components/StatusBadge';

// ใช้เฉด -800 เพื่อให้ contrast ผ่านเกณฑ์ WCAG AA บนพื้น -100
const STATUS_COLORS = {
  [YARD_STATUSES.loading]: 'bg-blue-100 text-blue-800',
  [YARD_STATUSES.completed]: 'bg-emerald-100 text-emerald-800',
  [YARD_STATUSES.available]: 'bg-green-100 text-green-800',
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
