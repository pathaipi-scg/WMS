import { memo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ChartCard } from './ChartCard';
import { useTimeDistributionData } from '../hooks/useTimeDistributionData';
import { CHART_MARGIN } from '../constants/charts';

const BOX_COLOR = '#6366f1';

// วาด box-and-whisker หนึ่งช่วงเวลาด้วย custom shape
// อาศัยว่า dataKey = "max" → recharts ให้ y = pixel ของ max, (y+height) = pixel ของ 0
// จึง map ค่าใด ๆ เป็น pixel ได้แบบเชิงเส้น (แกน Y เริ่มที่ 0)
function BoxPlotShape({ x, y, width, height, payload, color = BOX_COLOR }) {
  if (!payload || height <= 0) return null;
  const { min, q1, median, q3, max } = payload;
  const denom = max > 0 ? max : 1;
  const bottom = y + height;
  const toPx = (value) => bottom - (height * (value / denom));

  const cx = x + width / 2;
  const boxW = Math.min(width, 26);
  const left = cx - boxW / 2;
  const right = cx + boxW / 2;

  const yMin = toPx(min);
  const yQ1 = toPx(q1);
  const yMed = toPx(median);
  const yQ3 = toPx(q3);
  const yMax = toPx(max);

  return (
    <g>
      {/* whisker เส้นกลาง min → max */}
      <line x1={cx} y1={yMin} x2={cx} y2={yMax} stroke={color} strokeWidth={1.5} />
      {/* caps บน/ล่าง */}
      <line x1={left + 4} y1={yMax} x2={right - 4} y2={yMax} stroke={color} strokeWidth={1.5} />
      <line x1={left + 4} y1={yMin} x2={right - 4} y2={yMin} stroke={color} strokeWidth={1.5} />
      {/* กล่อง Q1 → Q3 */}
      <rect
        x={left}
        y={yQ3}
        width={boxW}
        height={Math.max(yQ1 - yQ3, 1)}
        fill={color}
        fillOpacity={0.22}
        stroke={color}
        strokeWidth={1.5}
        rx={2}
      />
      {/* เส้น median */}
      <line x1={left} y1={yMed} x2={right} y2={yMed} stroke={color} strokeWidth={2} />
    </g>
  );
}

function CustomTooltip({ active, payload, label, groupBy }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const lines = [
    ['สูงสุด', row.max],
    ['Q3', row.q3],
    ['มัธยฐาน', row.median],
    ['Q1', row.q1],
    ['ต่ำสุด', row.min],
  ];
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-sm min-w-40">
      <p className="mb-1.5 font-medium text-gray-700">
        {groupBy === 'hour' ? `${label} น.` : label} · {row.count} คัน
      </p>
      {lines.map(([name, value]) => (
        <div key={name} className="flex items-center justify-between gap-4">
          <span className="text-gray-500">{name}</span>
          <span className="font-semibold text-gray-700">{value} นาที</span>
        </div>
      ))}
    </div>
  );
}

// box plot ของทิศทางเดียว (รายวัน หรือ รายชั่วโมง)
function BoxPlotCard({ title, subtitle, groupBy, rows, loading, error }) {
  return (
    <ChartCard title={title} subtitle={loading ? undefined : subtitle} loading={loading} error={error} height={280}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={CHART_MARGIN}>
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
          <Tooltip content={<CustomTooltip groupBy={groupBy} />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
          <Bar dataKey="max" shape={<BoxPlotShape />} isAnimationActive={false} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// การกระจายเวลารวม (box plot) — วางคู่กัน: รายวัน (ซ้าย) · รายชั่วโมง (ขวา) ไม่แยกประเภทรถ
export const TimeDistributionChart = memo(function TimeDistributionChart({ preset, dateFrom, dateTo }) {
  const daily = useTimeDistributionData(preset, 'day', dateFrom, dateTo);
  const hourly = useTimeDistributionData(preset, 'hour', dateFrom, dateTo);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <BoxPlotCard
        title="การกระจายเวลารวม · รายวัน"
        subtitle="กล่อง = Q1–Q3 · เส้นกลาง = มัธยฐาน · หนวด = ต่ำสุด–สูงสุด"
        groupBy="day"
        rows={daily.data?.data ?? []}
        loading={daily.loading}
        error={daily.error}
      />
      <BoxPlotCard
        title="การกระจายเวลารวม · รายชั่วโมง"
        subtitle="รวมทุกวันตามชั่วโมงของวัน (0–23)"
        groupBy="hour"
        rows={hourly.data?.data ?? []}
        loading={hourly.loading}
        error={hourly.error}
      />
    </div>
  );
});
