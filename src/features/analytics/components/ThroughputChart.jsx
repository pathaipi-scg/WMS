import { memo, useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { ChartCard } from './ChartCard';
import { ChartToggle } from './ChartToggle';
import { useThroughputData } from '../hooks/useThroughputData';
import { GROUP_OPTIONS, canUseHour, CHART_MARGIN, MAX_DOTS_THRESHOLD } from '../constants/charts';

function CustomTooltip({ active, payload, label, groupBy }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-sm">
      <p className="font-medium text-gray-700">
        {groupBy === 'hour' ? `${label} น.` : label}
      </p>
      <p className="mt-0.5 font-semibold text-red-600">
        {payload[0].value} คัน
      </p>
    </div>
  );
}

export const ThroughputChart = memo(function ThroughputChart({ preset, dateFrom, dateTo }) {
  const [groupBy, setGroupBy] = useState('hour');

  // auto-switch to 'day' เมื่อเลือก preset ที่ไม่ใช่ today
  // เพราะ multi-day + hour จะรวมทุกชั่วโมงที่ 8 ของทุกวันเข้าด้วยกัน
  useEffect(() => {
    if (!canUseHour(preset)) setGroupBy('day');
  }, [preset]);

  const { data, loading, error } = useThroughputData(preset, groupBy, dateFrom, dateTo);

  const chartData = data?.data ?? [];
  const total = chartData.reduce((sum, d) => sum + d.count, 0);
  const avg   = chartData.length ? Math.round(total / chartData.length) : 0;

  return (
    <ChartCard
      title="ปริมาณรถเข้าตามช่วงเวลา"
      subtitle={loading ? undefined : `รวม ${total} คัน · เฉลี่ย ${avg} คัน/${groupBy === 'hour' ? 'ชั่วโมง' : 'วัน'}`}
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
          {avg > 0 && (
            <ReferenceLine
              y={avg}
              stroke="#d1d5db"
              strokeDasharray="4 4"
              label={{ value: `เฉลี่ย ${avg}`, position: 'insideTopRight', fontSize: 10, fill: '#9ca3af' }}
            />
          )}
          <Line
            type="monotone"
            dataKey="count"
            stroke="#ef4444"
            strokeWidth={2}
            dot={chartData.length <= MAX_DOTS_THRESHOLD ? { r: 3, fill: '#ef4444', strokeWidth: 0 } : false}
            activeDot={{ r: 5, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
});
