import { memo, useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { ChartCard } from './ChartCard';
import { ChartToggle } from './ChartToggle';
import { useThroughputByTruckTypeData } from '../hooks/useThroughputByTruckTypeData';
import { GROUP_OPTIONS, canUseHour, CHART_MARGIN, MAX_DOTS_THRESHOLD, TRUCK_TYPE_SERIES } from '../constants/charts';

function CustomTooltip({ active, payload, label, groupBy }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum, p) => sum + (p.value ?? 0), 0);
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-sm min-w-36">
      <p className="mb-1.5 font-medium text-gray-700">
        {groupBy === 'hour' ? `${label} น.` : label}
      </p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-gray-500">{p.name}</span>
          </div>
          <span className="font-semibold text-gray-700">{p.value ?? 0} คัน</span>
        </div>
      ))}
      <div className="mt-1.5 flex items-center justify-between gap-3 border-t border-gray-100 pt-1.5">
        <span className="text-gray-500">รวม</span>
        <span className="font-semibold text-red-600">{total} คัน</span>
      </div>
    </div>
  );
}

export const ThroughputChart = memo(function ThroughputChart({ preset, dateFrom, dateTo }) {
  const [groupBy, setGroupBy] = useState('hour');

  // auto-switch to 'day' เมื่อเลือก preset ที่ไม่ใช่ today
  useEffect(() => {
    if (!canUseHour(preset)) setGroupBy('day');
  }, [preset]);

  const { data, loading, error } = useThroughputByTruckTypeData(preset, groupBy, dateFrom, dateTo);
  const chartData = useMemo(() => data?.data ?? [], [data]);

  const total = useMemo(
    () => chartData.reduce(
      (sum, row) => sum + TRUCK_TYPE_SERIES.reduce((s, { key }) => s + (row[key] ?? 0), 0),
      0,
    ),
    [chartData],
  );

  return (
    <ChartCard
      title="ปริมาณรถเข้าตามช่วงเวลา"
      subtitle={loading ? undefined : `รวม ${total} คัน · แยกตามประเภทรถ`}
      loading={loading}
      error={error}
      height={260}
      action={
        <ChartToggle
          options={GROUP_OPTIONS}
          value={groupBy}
          onChange={setGroupBy}
          disableHour={!canUseHour(preset)}
        />
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={CHART_MARGIN}>
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
          />
          <Tooltip content={<CustomTooltip groupBy={groupBy} />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          {TRUCK_TYPE_SERIES.map(({ key, label, color }) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={label}
              stroke={color}
              strokeWidth={2}
              dot={chartData.length <= MAX_DOTS_THRESHOLD ? { r: 3, fill: color, strokeWidth: 0 } : false}
              activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
});
