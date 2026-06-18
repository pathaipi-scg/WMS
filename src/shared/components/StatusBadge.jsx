import { memo } from 'react';

const SIZE_STYLES = {
  sm: 'px-3 py-1 text-[11px]',
  lg: 'px-4 py-1.5 text-sm',
};

export const StatusBadge = memo(function StatusBadge({ label, colorClass, size = 'sm' }) {
  const sizeClassName = SIZE_STYLES[size] ?? SIZE_STYLES.sm;

  if (!colorClass) {
    return <span>{label || '-'}</span>;
  }

  return (
    <span className={`inline-block whitespace-nowrap rounded-full font-bold ${sizeClassName} ${colorClass}`}>
      {label}
    </span>
  );
});
