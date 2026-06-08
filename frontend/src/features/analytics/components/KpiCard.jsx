import { memo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

function ChangeBadge({ changePct }) {
  if (changePct === null || changePct === undefined) {
    return <span className="text-xs text-gray-400">ไม่มีข้อมูลเปรียบเทียบ</span>;
  }
  const isUp = changePct > 0;
  const isFlat = changePct === 0;
  const Icon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;
  const colorClass = isFlat
    ? 'text-gray-500'
    : isUp
      ? 'text-red-500'
      : 'text-emerald-500';

  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium ${colorClass}`}>
      <Icon className="h-3.5 w-3.5" />
      {isFlat ? 'เท่าเดิม' : `${Math.abs(changePct)}%`}
    </span>
  );
}

export const KpiCard = memo(function KpiCard({
  label,
  value,
  unit = '',
  subtitle,
  changePct,
  icon: Icon,
  loading = false,
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        {Icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
            <Icon className="h-5 w-5 text-red-500" />
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-8 w-24 animate-pulse rounded-md bg-gray-100" />
      ) : (
        <div className="flex items-end gap-1.5">
          <span className="text-3xl font-bold text-gray-900 leading-none">
            {value ?? '—'}
          </span>
          {unit && value !== null && value !== undefined && (
            <span className="mb-0.5 text-sm text-gray-400">{unit}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        {subtitle && (
          <span className="text-xs text-gray-400">{subtitle}</span>
        )}
        {!loading && <ChangeBadge changePct={changePct} />}
      </div>
    </div>
  );
});
