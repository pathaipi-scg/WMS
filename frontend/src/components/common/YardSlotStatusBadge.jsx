import { memo } from 'react';
import { YARD_STATUSES, YARD_STATUS_LABELS } from '../../constants/yard';
// คอมโพเนนต์แสดงสถานะของช่องจ่ายลานด้วย badge ที่มีสีและขนาดปรับได้ตามสถานะและขนาดที่กำหนด

const SIZE_STYLES = {
  sm: 'px-3 py-1 text-[11px]',
  lg: 'px-4 py-1.5 text-sm',
};

const STATUS_STYLES = {
  [YARD_STATUSES.loading]: 'bg-blue-100 text-blue-700',
  [YARD_STATUSES.completed]: 'bg-emerald-100 text-emerald-700',
  [YARD_STATUSES.available]: 'bg-green-100 text-green-700',
};

function normalizeYardSlotStatus(status, label) {
  const normalizedStatus = String(status ?? '').trim().toLowerCase();
  const normalizedLabel = String(label ?? '').trim().toLowerCase();
  const value = normalizedStatus || normalizedLabel;

  if (value.includes(YARD_STATUSES.available) || normalizedLabel.includes(YARD_STATUS_LABELS.available)) {
    return YARD_STATUSES.available;
  }

  if (value.includes(YARD_STATUSES.loading) || normalizedLabel.includes(YARD_STATUS_LABELS.loading)) {
    return YARD_STATUSES.loading;
  }
  return YARD_STATUSES.completed;
}

export const YardSlotStatusBadge = memo(function YardSlotStatusBadge({
  status,
  label,
  size = 'sm',
}) {
  const normalizedStatus = normalizeYardSlotStatus(status, label);
  const badgeLabel = String(label ?? '').trim() || '-';
  const sizeClassName = SIZE_STYLES[size] ?? SIZE_STYLES.sm;
  const statusClassName = STATUS_STYLES[normalizedStatus] ?? STATUS_STYLES.occupied;

  return (
    <span className={`rounded-full font-bold ${sizeClassName} ${statusClassName}`}>
      {badgeLabel}
    </span>
  );
});
