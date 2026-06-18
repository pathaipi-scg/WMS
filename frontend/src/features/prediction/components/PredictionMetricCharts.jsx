import { memo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { ChartCard, CHART_MARGIN, MAX_DOTS_THRESHOLD, canUseHour } from '../../analytics';
import { usePredictionMetricsTimeseries } from '../hooks/usePredictionMetricsTimeseries';

const COLORS = { mae: '#3b82f6', rmse: '#ef4444', r2: '#22c55e' };

function periodLabel(label, groupBy) {
  return groupBy === 'hour' ? `${label} น.` : label;
}

function ErrorTooltip({ active, payload, label, groupBy }) {
  if (!active || !payload?.length) return null;
  const n = payload[0]?.payload?.n;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-sm">
      <p className="font-medium text-gray-700">{periodLabel(label, groupBy)}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="mt-0.5 font-semibold" style={{ color: p.color }}>
          {p.name}: {p.value ?? '—'} นาที
        </p>
      ))}
      {n != null && <p className="mt-1 text-gray-500">{n} คัน</p>}
    </div>
  );
}

function AccuracyTooltip({ active, payload, label, groupBy }) {
  if (!active || !payload?.length) return null;
  const n = payload[0]?.payload?.n;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-sm">
      <p className="font-medium text-gray-700">{periodLabel(label, groupBy)}</p>
      <p className="mt-0.5 font-semibold" style={{ color: COLORS.r2 }}>
        ความแม่นยำ: {payload[0].value ?? '—'} %
      </p>
      {n != null && <p className="mt-1 text-gray-500">{n} คัน</p>}
    </div>
  );
}


export const PredictionMetricCharts = memo(function PredictionMetricCharts({ preset, dateFrom, dateTo, model = null, live = false }) {
  const groupBy = canUseHour(preset) ? 'hour' : 'day';
  const { data, loading, error } = usePredictionMetricsTimeseries(preset, groupBy, dateFrom, dateTo, model, live);

  const chartData = data?.data ?? [];
  const showDots = chartData.length <= MAX_DOTS_THRESHOLD;
  const summary = data?.summary ?? {};
  const avgMae = summary.mae ?? null;
  const avgRmse = summary.rmse ?? null;
  const avgAccuracy = summary.accuracy ?? null;

  const xAxis = (
    <XAxis
      dataKey="period"
      tick={{ fontSize: 11, fill: '#9ca3af' }}
      axisLine={false}
      tickLine={false}
      interval="preserveStartEnd"
    />
  );

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* ซ้าย — MAE / RMSE เส้นคู่ */}
      <ChartCard
        title="แนวโน้มความคลาดเคลื่อน (MAE / RMSE)"
        subtitle={loading ? undefined : `เฉลี่ย MAE ${avgMae ?? '—'} · RMSE ${avgRmse ?? '—'} นาที`}
        loading={loading}
        error={error}
        height={240}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            {xAxis}
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip content={<ErrorTooltip groupBy={groupBy} />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone" dataKey="mae" name="MAE" stroke={COLORS.mae} strokeWidth={2}
              connectNulls dot={showDots ? { r: 3, fill: COLORS.mae, strokeWidth: 0 } : false}
              activeDot={{ r: 5, fill: COLORS.mae, stroke: '#fff', strokeWidth: 2 }}
            />
            <Line
              type="monotone" dataKey="rmse" name="RMSE" stroke={COLORS.rmse} strokeWidth={2}
              connectNulls dot={showDots ? { r: 3, fill: COLORS.rmse, strokeWidth: 0 } : false}
              activeDot={{ r: 5, fill: COLORS.rmse, stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ขวา — Accuracy */}
      <ChartCard
        title="แนวโน้มความแม่นยำ (±15 นาที)"
        subtitle={loading ? undefined : `เฉลี่ย ${avgAccuracy ?? '—'} %`}
        loading={loading}
        error={error}
        height={240}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            {xAxis}
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <Tooltip content={<AccuracyTooltip groupBy={groupBy} />} />
            <Line
              type="monotone" dataKey="accuracy" name="ความแม่นยำ" stroke={COLORS.r2} strokeWidth={2}
              connectNulls dot={showDots ? { r: 3, fill: COLORS.r2, strokeWidth: 0 } : false}
              activeDot={{ r: 5, fill: COLORS.r2, stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
});
