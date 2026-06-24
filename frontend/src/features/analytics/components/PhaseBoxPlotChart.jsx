import { memo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { ChartCard } from './ChartCard';
import { CHART_MARGIN, TRUCK_TYPE_SERIES } from '../constants/charts';

// วาด box-and-whisker ของประเภทรถหนึ่งด้วย custom shape (อาศัยว่า dataKey = ค่า max ของชนิดนั้น)
function TypedBoxShape({ x, y, width, height, payload, statsKey, color }) {
  const stats = payload?.[statsKey];
  if (!stats || height <= 0) return null;

  const { min, q1, median, q3, max } = stats;
  const denom = max > 0 ? max : 1;
  const bottom = y + height;
  const toPx = (value) => bottom - (height * (value / denom));

  const cx = x + width / 2;
  const boxW = Math.min(width, 14);
  const left = cx - boxW / 2;
  const right = cx + boxW / 2;

  return (
    <g>
      <line x1={cx} y1={toPx(min)} x2={cx} y2={toPx(max)} stroke={color} strokeWidth={1.25} />
      <line x1={left + 2} y1={toPx(max)} x2={right - 2} y2={toPx(max)} stroke={color} strokeWidth={1.25} />
      <line x1={left + 2} y1={toPx(min)} x2={right - 2} y2={toPx(min)} stroke={color} strokeWidth={1.25} />
      <rect
        x={left}
        y={toPx(q3)}
        width={boxW}
        height={Math.max(toPx(q1) - toPx(q3), 1)}
        fill={color}
        fillOpacity={0.28}
        stroke={color}
        strokeWidth={1.25}
        rx={1.5}
      />
      <line x1={left} y1={toPx(median)} x2={right} y2={toPx(median)} stroke={color} strokeWidth={1.75} />
    </g>
  );
}

function PhaseTooltip({ active, payload, label, groupBy }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const items = TRUCK_TYPE_SERIES.filter(({ key }) => row[key]);
  if (!items.length) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-sm min-w-44">
      <p className="mb-1.5 font-medium text-gray-700">{groupBy === 'hour' ? `${label} น.` : label}</p>
      {items.map(({ key, label: tLabel, color }) => {
        const s = row[key];
        return (
          <div key={key} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
              <span className="text-gray-500">{tLabel}</span>
            </span>
            <span className="font-semibold text-gray-700">
              {s.median} <span className="font-normal text-gray-400">({s.min}–{s.max})</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// box plot แยกชนิดรถของช่วงเวลาเดียว (รายวัน หรือ รายชั่วโมง)
function PhaseBoxCard({ title, subtitle, rows, groupBy, loading, error }) {
  return (
    <ChartCard title={title} subtitle={loading ? undefined : subtitle} loading={loading} error={error} height={260}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={CHART_MARGIN} barCategoryGap="15%">
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
          <Tooltip content={<PhaseTooltip groupBy={groupBy} />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
          <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          {TRUCK_TYPE_SERIES.map(({ key, label, color }) => (
            <Bar
              key={key}
              dataKey={(row) => row[key]?.max ?? 0}
              name={label}
              fill={color}
              maxBarSize={12}
              isAnimationActive={false}
              shape={(props) => <TypedBoxShape {...props} statsKey={key} color={color} />}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// หนึ่ง "ช่วงเวลา" วางคู่กัน: รายวัน (ซ้าย) · รายชั่วโมง (ขวา) — box plot แยกชนิดรถ
export const PhaseBoxPlotPair = memo(function PhaseBoxPlotPair({
  title, dailyRows, hourlyRows, loading, error,
}) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <PhaseBoxCard
        title={`${title} · รายวัน`}
        subtitle="กล่อง = Q1–Q3 · เส้นกลาง = มัธยฐาน · หนวด = ต่ำสุด–สูงสุด"
        rows={dailyRows}
        groupBy="day"
        loading={loading}
        error={error}
      />
      <PhaseBoxCard
        title={`${title} · รายชั่วโมง`}
        subtitle="รวมทุกวันตามชั่วโมงของวัน (0–23)"
        rows={hourlyRows}
        groupBy="hour"
        loading={loading}
        error={error}
      />
    </div>
  );
});
