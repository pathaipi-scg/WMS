import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { ChartCard } from './ChartCard';
import { useThroughputData } from '../hooks/useThroughputData';

// รายชั่วโมงใช้ได้เฉพาะ today เพราะ multi-day + hour จะรวม
// ทุกชั่วโมงที่ 8 ของทุกวันเข้าด้วยกัน ไม่ใช่ trend รายชั่วโมง
const canUseHour = (preset) => preset === 'today';

const GROUP_OPTIONS = [
  { value: 'hour', label: 'รายชั่วโมง' },
  { value: 'day',  label: 'รายวัน' },
];

function GroupToggle({ value, onChange, preset }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
      {GROUP_OPTIONS.map((opt) => {
        const disabled = opt.value === 'hour' && !canUseHour(preset);
        return (
          <button
            key={opt.value}
            onClick={() => !disabled && onChange(opt.value)}
            disabled={disabled}
            title={disabled ? 'รายชั่วโมงใช้ได้เฉพาะ "วันนี้"' : undefined}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              disabled
                ? 'text-gray-300 cursor-not-allowed'
                : value === opt.value
                  ? 'bg-white text-red-600 shadow-sm border border-gray-200 cursor-pointer'
                  : 'text-gray-500 hover:text-gray-700 cursor-pointer'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function CustomTooltip({ active, payload, label, groupBy }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-sm">
      <p className="font-medium text-gray-700">
        {groupBy === 'hour' ? `${label} น.` : label}
      </p>
      <p className="mt-0.5 text-red-600 font-semibold">
        {payload[0].value} คัน
      </p>
    </div>
  );
}

export function ThroughputChart({ preset, dateFrom, dateTo }) {
  const [groupBy, setGroupBy] = useState('hour');

  // auto-switch to 'day' เมื่อเลือก preset ที่ไม่ใช่ today
  useEffect(() => {
    if (!canUseHour(preset)) {
      setGroupBy('day');
    }
  }, [preset]);

  const { data, loading, error } = useThroughputData(preset, groupBy, dateFrom, dateTo);

  const chartData = data?.data ?? [];
  const total = chartData.reduce((sum, d) => sum + d.count, 0);
  const avg = chartData.length ? Math.round(total / chartData.length) : 0;

  return (
    <ChartCard
      title="ปริมาณรถเข้าตามช่วงเวลา"
      subtitle={loading ? undefined : `รวม ${total} คัน · เฉลี่ย ${avg} คัน/${groupBy === 'hour' ? 'ชั่วโมง' : 'วัน'}`}
      loading={loading}
      error={error}
      height={260}
      action={<GroupToggle value={groupBy} onChange={setGroupBy} preset={preset} />}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
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
            dot={chartData.length <= 31 ? { r: 3, fill: '#ef4444', strokeWidth: 0 } : false}
            activeDot={{ r: 5, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
