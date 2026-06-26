import { memo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ChartCard } from './ChartCard';
import { useLanePhaseBreakdownData } from '../hooks/useLanePhaseBreakdownData';

// 5 ช่วงเวลา เรียงบน→ล่างตามภาพ (รอเรียก = บนสุด) · key ตรงกับ backend
const PHASE_SERIES = [
  { key: 'wait_call',  label: 'รอเรียก',   color: '#06b6d4' },
  { key: 'wait_load',  label: 'รอโหลด',    color: '#ec4899' },
  { key: 'load',       label: 'โหลด',      color: '#a3e635' },
  { key: 'wait_close', label: 'รอปิดงาน',  color: '#f87171' },
  { key: 'wait_post',  label: 'รอ post',   color: '#10b981' },
];

// Recharts ซ้อนแท่งจาก Bar ตัวแรก = ล่างสุด → กลับลำดับให้ wait_call อยู่บนสุดตามภาพ
const STACK_ORDER = [...PHASE_SERIES].reverse();
const TOP_KEY = PHASE_SERIES[0].key;

function LaneTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-sm min-w-48">
      <p className="mb-1.5 font-medium text-gray-700">
        {label} <span className="font-normal text-gray-400">· {row.truck_count ?? 0} คัน</span>
      </p>
      {PHASE_SERIES.map(({ key, label: pLabel, color }) => (
        <div key={key} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-gray-500">{pLabel}</span>
          </span>
          <span className="font-semibold text-gray-700">
            {row[key] ?? '—'} <span className="font-normal text-gray-400">น.</span>
          </span>
        </div>
      ))}
      <div className="mt-1.5 flex justify-between border-t border-gray-200 pt-1.5 font-bold text-gray-800">
        <span>รวมเฉลี่ย</span>
        <span className="tabular-nums">{row.total ?? 0} น.</span>
      </div>
    </div>
  );
}

function LaneLegend() {
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-3 text-[11px]">
      {PHASE_SERIES.map(({ key, label, color }) => (
        <div key={key} className="flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
          <span className="text-gray-500">{label}</span>
        </div>
      ))}
    </div>
  );
}

// stacked bar เวลาเฉลี่ย 5 ช่วง ต่อลานจอด (หนึ่งแท่งต่อลาน)
export const LanePhaseBreakdownChart = memo(function LanePhaseBreakdownChart({ preset, dateFrom, dateTo }) {
  const { data, loading, error } = useLanePhaseBreakdownData(preset, dateFrom, dateTo);
  const lanes = data?.lanes ?? [];

  return (
    <ChartCard
      title="เวลาเฉลี่ยแต่ละช่วง · แยกตามลานจอด"
      subtitle={loading ? undefined : 'เวลาเฉลี่ย (นาที) ของ 5 ช่วงในวงจรรถ ต่อลานจอด'}
      loading={loading}
      error={error}
      height={400}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={lanes} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis
            dataKey="lane"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            unit=" น."
          />
          <Tooltip content={<LaneTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
          {STACK_ORDER.map(({ key, label, color }) => (
            <Bar
              key={key}
              dataKey={key}
              name={label}
              stackId="lane"
              fill={color}
              maxBarSize={80}
              isAnimationActive={false}
              radius={key === TOP_KEY ? [4, 4, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <LaneLegend />
    </ChartCard>
  );
});
