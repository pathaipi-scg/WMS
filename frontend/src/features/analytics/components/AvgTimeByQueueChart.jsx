import { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { ChartCard } from './ChartCard';
import { useAvgTimeByTruckTypeData } from '../hooks/useAvgTimeByTruckTypeData';

/* ── config ─────────────────────────────────────────────────── */

const TRUCK_TYPES = [
  { key: '4 ล้อ',    label: '4 ล้อ',    color: '#3b82f6' },
  { key: '6 ล้อ',    label: '6 ล้อ',    color: '#10b981' },
  { key: '10 ล้อ',   label: '10 ล้อ',   color: '#f59e0b' },
  { key: 'เทรเลอร์', label: 'เทรเลอร์', color: '#ef4444' },
  { key: 'อื่นๆ',    label: 'อื่นๆ',    color: '#9ca3af' },
];

const METRICS = [
  { value: 'avg_wait',  label: 'เวลารอ' },
  { value: 'avg_load',  label: 'เวลาโหลด' },
  { value: 'avg_total', label: 'เวลารวม' },
];

const GROUP_OPTIONS = [
  { value: 'hour', label: 'รายชั่วโมง' },
  { value: 'day',  label: 'รายวัน' },
];

const canUseHour = (preset) => preset === 'today';

/* ── toggle ─────────────────────────────────────────────────── */

function Toggle({ options, value, onChange, disableHour = false }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
      {options.map((opt) => {
        const disabled = disableHour && opt.value === 'hour';
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

/* ── tooltip ─────────────────────────────────────────────────── */

function CustomTooltip({ active, payload, label, groupBy }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-sm min-w-36">
      <p className="mb-1.5 font-medium text-gray-700">
        {groupBy === 'hour' ? `${label} น.` : label}
      </p>
      {payload.map((p) => (
        p.value != null && (
          <div key={p.dataKey} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
              <span className="text-gray-500">{p.name}</span>
            </div>
            <span className="font-semibold text-gray-700">{p.value} นาที</span>
          </div>
        )
      ))}
    </div>
  );
}

/* ── main ────────────────────────────────────────────────────── */

export function AvgTimeByQueueChart({
  preset, dateFrom, dateTo,
  kpiAvgWait = null, kpiAvgLoad = null, kpiAvgTotal = null,
}) {
  const [groupBy, setGroupBy] = useState('hour');
  const [metric,  setMetric]  = useState('avg_total');

  // auto-switch to 'day' when preset is not 'today'
  useEffect(() => {
    if (!canUseHour(preset)) {
      setGroupBy('day');
    }
  }, [preset]);

  const { data, loading, error } = useAvgTimeByTruckTypeData(preset, groupBy, dateFrom, dateTo);
  const rawData = data?.data ?? [];

  // Flatten: { period, "4 ล้อ": val, "6 ล้อ": val, … }
  const chartData = useMemo(
    () =>
      rawData.map((row) => {
        const point = { period: row.period };
        TRUCK_TYPES.forEach(({ key }) => {
          point[key] = row[key]?.[metric] ?? null;
        });
        return point;
      }),
    [rawData, metric],
  );

  // เส้นอ้างอิง = ค่าจาก KPI card (weighted average ที่ถูกต้อง)
  // ไม่คำนวณเองใน frontend เพื่อหลีกเลี่ยง average-of-averages
  const kpiRef = metric === 'avg_wait'
    ? kpiAvgWait
    : metric === 'avg_load'
      ? kpiAvgLoad
      : kpiAvgTotal;

  const metricLabel = METRICS.find((m) => m.value === metric)?.label ?? '';

  return (
    <ChartCard
      title="เวลาเฉลี่ยแยกตามประเภทรถ"
      subtitle={loading ? undefined : `${metricLabel} · แยกตาม 4 ล้อ / 6 ล้อ / 10 ล้อ / เทรเลอร์`}
      loading={loading}
      error={error}
      height={280}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Toggle options={METRICS}       value={metric}  onChange={setMetric} />
          <Toggle options={GROUP_OPTIONS} value={groupBy} onChange={setGroupBy} disableHour={!canUseHour(preset)} />
        </div>
      }
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
            unit=" น."
          />
          <Tooltip content={<CustomTooltip groupBy={groupBy} />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          />
          {kpiRef != null && (
            <ReferenceLine
              y={kpiRef}
              stroke="#d1d5db"
              strokeDasharray="4 4"
              label={{
                value: `เฉลี่ยรวม ${kpiRef} น.`,
                position: 'insideTopRight',
                fontSize: 10,
                fill: '#9ca3af',
              }}
            />
          )}
          {TRUCK_TYPES.map(({ key, label, color }) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={label}
              stroke={color}
              strokeWidth={2}
              dot={chartData.length <= 31 ? { r: 3, fill: color, strokeWidth: 0 } : false}
              activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
