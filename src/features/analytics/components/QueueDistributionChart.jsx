import { memo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartCard } from './ChartCard';
import { useQueueDistributionData } from '../hooks/useQueueDistributionData';

const CHART_HEIGHT = 260;

const COLORS = {
  'SmartQ':   '#ef4444',
  'Walk in':  '#3b82f6',
  'ล่วงหน้า': '#10b981',
  'อื่นๆ':    '#d1d5db',
};

const COLOR_LIST = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#d1d5db'];

const getColor = (queueType, index) => COLORS[queueType] ?? COLOR_LIST[index];

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-sm">
      <p className="font-medium text-gray-700">{d.queue_type}</p>
      <p className="mt-0.5 font-semibold" style={{ color: payload[0].fill }}>
        {d.count} คัน ({d.pct}%)
      </p>
    </div>
  );
}

function QueueLegend({ items }) {
  return (
    <div className="mt-4 flex flex-col gap-2">
      {items.map((item, i) => (
        <div key={item.queue_type} className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: getColor(item.queue_type, i) }}
            />
            <span className="truncate text-xs text-gray-600">{item.queue_type}</span>
          </div>
          <span className="shrink-0 text-xs font-semibold text-gray-700">
            {item.count} <span className="font-normal text-gray-400">({item.pct}%)</span>
          </span>
        </div>
      ))}
    </div>
  );
}

export const QueueDistributionChart = memo(function QueueDistributionChart({ preset, dateFrom, dateTo }) {
  const { data, loading, error } = useQueueDistributionData(preset, dateFrom, dateTo);
  const items = data?.data ?? [];

  return (
    <ChartCard
      title="สัดส่วนประเภทคิว"
      subtitle={loading ? undefined : `รวม ${data?.total ?? 0} คัน`}
      loading={loading}
      error={error}
      height={CHART_HEIGHT}
    >
      <div className="flex items-center" style={{ height: CHART_HEIGHT }}>
        <ResponsiveContainer width="55%" height={CHART_HEIGHT - 20}>
          <PieChart>
            <Pie
              data={items}
              dataKey="count"
              nameKey="queue_type"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
              strokeWidth={0}
            >
              {items.map((entry, index) => (
                <Cell key={entry.queue_type} fill={getColor(entry.queue_type, index)} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1">
          <QueueLegend items={items} />
        </div>
      </div>
    </ChartCard>
  );
});
