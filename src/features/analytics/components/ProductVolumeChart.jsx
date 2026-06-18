import { memo, useRef, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { ChartCard } from './ChartCard';
import { useProductVolumeData } from '../hooks/useProductVolumeData';

const BRANDS = [
  { key: 'cpac_tile',        label: 'CPACTile',        color: '#ef4444', roundTop: false },
  { key: 'prestige_tile',    label: 'PRESTIGETile',    color: '#3b82f6', roundTop: false },
  { key: 'neustile_tile',    label: 'NEUSTILETile',    color: '#10b981', roundTop: false },
  { key: 'cpac_fitting',     label: 'CPACFitting',     color: '#f97316', roundTop: false },
  { key: 'prestige_fitting', label: 'PRESTIGEFitting', color: '#6366f1', roundTop: false },
  { key: 'neustile_fitting', label: 'NEUSTILEFitting', color: '#06b6d4', roundTop: false },
  { key: 'dura_fitting',     label: 'DURAFitting',     color: '#f59e0b', roundTop: false },
  { key: 'accessories',      label: 'ACCESSORIES',     color: '#8b5cf6', roundTop: true  },
];

const GROUPS = [
  { prefix: 'scgr',   label: 'งานโอน (SCGR)' },
  { prefix: 'others', label: 'งานขาย' },
];

// debounce delay ป้องกัน tooltip กระพริบตอนเลื่อนผ่าน segment ในแท่งเดียวกัน
const BAR_LEAVE_DELAY_MS = 80;

function BrandRow({ fill, name, value }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: fill }} />
        <span className="truncate text-gray-500">{name}</span>
      </div>
      <span className="shrink-0 pl-4 font-medium tabular-nums text-gray-700">
        {(value ?? 0).toLocaleString()}
      </span>
    </div>
  );
}

function CustomTooltip({ active, payload, label, activeGroup }) {
  if (!active || !payload?.length) return null;

  const grandTotal = payload.reduce((s, p) => s + (p.value ?? 0), 0);
  const baseCard = 'rounded-lg border border-gray-200 bg-white shadow-lg text-xs overflow-hidden';
  const header = (
    <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5">
      <p className="text-sm font-semibold text-gray-700">{label}</p>
    </div>
  );

  // hover บนแท่งใดแท่งหนึ่ง → แสดงเฉพาะกลุ่มนั้น
  if (activeGroup) {
    const g = GROUPS.find((g) => g.prefix === activeGroup);
    const items = payload.filter((p) => p.dataKey.startsWith(`${activeGroup}_`));
    const total = items.reduce((s, p) => s + (p.value ?? 0), 0);
    return (
      <div className={baseCard} style={{ minWidth: 220 }}>
        {header}
        <div className="px-4 py-3">
          <p className="mb-2 font-semibold text-gray-700">{g.label}</p>
          {items.map((p) => <BrandRow key={p.dataKey} fill={p.fill} name={p.name} value={p.value} />)}
          <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 text-sm font-bold text-gray-800">
            <span>รวม</span>
            <span className="tabular-nums">{total.toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  }

  // hover นอกแท่ง → แสดงทั้งสองกลุ่มเคียงกัน
  const groupData = GROUPS.map((g) => {
    const items = payload.filter((p) => p.dataKey.startsWith(`${g.prefix}_`));
    const total = items.reduce((s, p) => s + (p.value ?? 0), 0);
    return { ...g, items, total };
  });

  return (
    <div className={baseCard} style={{ minWidth: 420 }}>
      {header}
      <div className="flex divide-x divide-gray-100">
        {groupData.map((g) => (
          <div key={g.prefix} className="flex-1 px-4 py-3">
            <p className="mb-2 font-semibold text-gray-700">{g.label}</p>
            {g.items.map((p) => <BrandRow key={p.dataKey} fill={p.fill} name={p.name} value={p.value} />)}
            <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 font-semibold text-gray-700">
              <span>รวม</span>
              <span className="tabular-nums">{g.total.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between border-t border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-bold text-gray-800">
        <span>รวมทั้งหมด</span>
        <span className="tabular-nums">{grandTotal.toLocaleString()}</span>
      </div>
    </div>
  );
}

function CustomLegend() {
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2 text-[11px]">
      {BRANDS.map((b) => (
        <div key={b.key} className="flex items-center gap-1">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: b.color }} />
          <span className="text-gray-500">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

export const ProductVolumeChart = memo(function ProductVolumeChart({ preset, dateFrom, dateTo }) {
  const { data, loading, error } = useProductVolumeData(preset, dateFrom, dateTo);
  const chartData = data?.data ?? [];
  const [activeGroup, setActiveGroup] = useState(null);
  const leaveTimer = useRef(null);

  function handleBarEnter(prefix) {
    clearTimeout(leaveTimer.current);
    setActiveGroup(prefix);
  }
  function handleBarLeave() {
    leaveTimer.current = setTimeout(() => setActiveGroup(null), BAR_LEAVE_DELAY_MS);
  }

  const grandTotal = chartData.reduce(
    (s, d) => s + GROUPS.reduce(
      (gs, g) => gs + BRANDS.reduce((bs, b) => bs + (d[`${g.prefix}_${b.key}`] ?? 0), 0),
      0,
    ),
    0,
  );

  return (
    <ChartCard
      title="ปริมาณสินค้าต่อวัน"
      subtitle={loading ? undefined : `รวม ${grandTotal.toLocaleString()} หน่วย`}
      loading={loading}
      error={error}
      height={420}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
          barGap={3}
          barCategoryGap="25%"
        >
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
          <Tooltip
            content={(props) => <CustomTooltip {...props} activeGroup={activeGroup} />}
            position={{ y: 0 }}
            allowEscapeViewBox={{ x: false, y: true }}
          />
          <Legend content={<CustomLegend />} />
          {GROUPS.map((g) =>
            BRANDS.map((b) => (
              <Bar
                key={`${g.prefix}_${b.key}`}
                dataKey={`${g.prefix}_${b.key}`}
                name={b.label}
                stackId={g.prefix}
                fill={b.color}
                legendType="none"
                radius={b.roundTop ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                onMouseEnter={() => handleBarEnter(g.prefix)}
                onMouseLeave={handleBarLeave}
              />
            ))
          )}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
});
