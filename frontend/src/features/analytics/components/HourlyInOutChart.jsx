import { memo, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { ChartCard } from './ChartCard';
import { useHourlyInOutData } from '../hooks/useHourlyInOutData';
import { CHART_MARGIN, TRUCK_TYPE_SERIES } from '../constants/charts';

const DIRECTIONS = [
  { id: 'in',  label: 'เข้า', opacity: 1 },
  { id: 'out', label: 'ออก', opacity: 1 },
];

// รวมข้อมูล in/out เป็นแถวเดียวต่อชั่วโมง โดย prefix key ด้วยทิศทาง (in_/out_)
function mergeRows(data) {
  const byHour = new Map();
  const apply = (rows, dir) => {
    (rows ?? []).forEach((row) => {
      const entry = byHour.get(row.period) ?? { period: row.period };
      TRUCK_TYPE_SERIES.forEach(({ key }) => {
        entry[`${dir}_${key}`] = row[key] ?? 0;
      });
      byHour.set(row.period, entry);
    });
  };
  apply(data?.in, 'in');
  apply(data?.out, 'out');
  return [...byHour.values()].sort((a, b) => a.period.localeCompare(b.period));
}

function directionTotal(row, dir) {
  return TRUCK_TYPE_SERIES.reduce((sum, { key }) => sum + (row[`${dir}_${key}`] ?? 0), 0);
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-sm min-w-44">
      <p className="mb-1.5 font-medium text-gray-700">{label} น.</p>
      <div className="flex gap-4">
        {DIRECTIONS.map(({ id, label: dirLabel }) => (
          <div key={id} className="flex-1">
            <p className="mb-1 text-xs font-semibold text-gray-500">
              รถ{dirLabel} · {directionTotal(row, id)} คัน
            </p>
            {TRUCK_TYPE_SERIES.map(({ key, label: tLabel, color }) => (
              (row[`${id}_${key}`] ?? 0) > 0 && (
                <div key={key} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
                    <span className="text-gray-500">{tLabel}</span>
                  </span>
                  <span className="font-semibold text-gray-700">{row[`${id}_${key}`]}</span>
                </div>
              )
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// คำอธิบายสี (ชนิดรถ) + ความหมายทึบ/จาง (เข้า/ออก) — legend เอง เพราะมี 10 แท่งซ้ำชื่อ
function ChartLegend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-2 pt-2 text-[11px] text-gray-500">
      {TRUCK_TYPE_SERIES.map(({ key, label, color }) => (
        <span key={key} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />
          {label}
        </span>
      ))}
      <span className="text-gray-400">|</span>
      <span>แต่ละชั่วโมง: แท่งซ้าย = เข้า · แท่งขวา = ออก</span>
    </div>
  );
}

// รถเข้า/ออก รายชั่วโมง — กราฟเดียว แต่ละชั่วโมงมี 2 แท่ง (เข้า | ออก) วางข้างกัน แต่ละแท่งซ้อนตามชนิดรถ
// รวมทุกวันในช่วงที่เลือกตามชั่วโมงของวัน (เช่น 08:00 = ทุกวันรวมกัน)
export const HourlyInOutChart = memo(function HourlyInOutChart({ preset, dateFrom, dateTo }) {
  const { data, loading, error } = useHourlyInOutData(preset, dateFrom, dateTo);
  const rows = useMemo(() => mergeRows(data), [data]);

  const totalIn = rows.reduce((sum, row) => sum + directionTotal(row, 'in'), 0);
  const totalOut = rows.reduce((sum, row) => sum + directionTotal(row, 'out'), 0);

  return (
    <ChartCard
      title="รถเข้า/ออก รายชั่วโมง"
      subtitle={loading ? undefined : `เข้า ${totalIn} · ออก ${totalOut} คัน · แยกตามประเภทรถ`}
      loading={loading}
      error={error}
      height={290}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={CHART_MARGIN} barGap={1} barCategoryGap="20%">
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
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
          <Legend content={<ChartLegend />} verticalAlign="bottom" height={28} />
          {DIRECTIONS.map(({ id, opacity }) =>
            TRUCK_TYPE_SERIES.map(({ key, color }) => (
              <Bar
                key={`${id}_${key}`}
                dataKey={`${id}_${key}`}
                stackId={id}
                fill={color}
                fillOpacity={opacity}
                maxBarSize={22}
              />
            )),
          )}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
});
