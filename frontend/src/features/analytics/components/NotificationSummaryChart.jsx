import { memo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { ChartCard } from './ChartCard';
import { useNotificationSummaryData } from '../hooks/useNotificationSummaryData';

const CHART_HEIGHT = 260;

const CODE_COLORS = {
  1: '#f59e0b',
  2: '#fb923c',
  3: '#ef4444',
  4: '#8b5cf6',
  5: '#3b82f6',
};

const getColor = (detailCode) => CODE_COLORS[detailCode] ?? '#d1d5db';

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-sm">
      <p className="font-medium text-gray-700">{d.label}</p>
      <p className="mt-0.5 font-semibold" style={{ color: payload[0].fill }}>
        {d.count} ครั้ง ({d.pct}%)
      </p>
    </div>
  );
}

export const NotificationSummaryChart = memo(function NotificationSummaryChart({ preset, dateFrom, dateTo }) {
  const { data, loading, error } = useNotificationSummaryData(preset, dateFrom, dateTo);
  const items = data?.data ?? [];

  return (
    <ChartCard
      title="จำนวนการแจ้งเตือน"
      subtitle={loading ? undefined : `รวม ${data?.total ?? 0} ครั้ง`}
      loading={loading}
      error={error}
      height={CHART_HEIGHT}
    >
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <BarChart data={items} margin={{ top: 8, right: 8, left: -16, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6' }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {items.map((entry) => (
              <Cell key={entry.detail_code} fill={getColor(entry.detail_code)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
});
