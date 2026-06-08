import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { ChartCard } from './ChartCard';
import { useProductVolumeData } from '../hooks/useProductVolumeData';

const BRANDS = [
  { key: 'cpac',        label: 'CPAC',        color: '#ef4444' },
  { key: 'prestige',    label: 'PRESTIGE',     color: '#3b82f6' },
  { key: 'neustile',    label: 'NEUSTILE',     color: '#10b981' },
  { key: 'dura',        label: 'DURA',         color: '#f59e0b' },
  { key: 'accessories', label: 'ACCESSORIES', color: '#8b5cf6' },
];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value ?? 0), 0);
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-sm min-w-36">
      <p className="mb-1.5 font-medium text-gray-700">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.fill }} />
            <span className="text-gray-500">{p.name}</span>
          </div>
          <span className="font-semibold text-gray-700">{p.value.toLocaleString()}</span>
        </div>
      ))}
      <div className="mt-1.5 border-t border-gray-100 pt-1.5 flex justify-between">
        <span className="text-gray-500">รวม</span>
        <span className="font-bold text-gray-800">{total.toLocaleString()}</span>
      </div>
    </div>
  );
}

export function ProductVolumeChart({ preset, dateFrom, dateTo }) {
  const { data, loading, error } = useProductVolumeData(preset, dateFrom, dateTo);
  const chartData = data?.data ?? [];

  const grandTotal = chartData.reduce(
    (s, d) => s + BRANDS.reduce((bs, b) => bs + (d[b.key] ?? 0), 0),
    0,
  );

  return (
    <ChartCard
      title="ปริมาณสินค้าต่อวัน"
      subtitle={loading ? undefined : `รวม ${grandTotal.toLocaleString()} หน่วย`}
      loading={loading}
      error={error}
      height={280}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          />
          {BRANDS.map((b) => (
            <Bar
              key={b.key}
              dataKey={b.key}
              name={b.label}
              stackId="a"
              fill={b.color}
              radius={b.key === 'accessories' ? [3, 3, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
