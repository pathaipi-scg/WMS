import { useState } from 'react';
import { AlertCircle, Clock, Hourglass, Timer, TrendingUp, Truck } from 'lucide-react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import {
  AnalyticsDateRangePicker, KpiCard,
  ThroughputChart, QueueDistributionChart, ProductVolumeChart,
  AvgTimeByQueueChart,
  useKpiData,
} from '../features/analytics';

export function AnalyticsPage({ onNavigate }) {
  const [preset, setPreset] = useState('today');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, loading, error } = useKpiData(preset, dateFrom, dateTo);
  const kpi = data?.kpi ?? {};

  const presetLabel = {
    today:  'เมื่อวาน',
    '7d':   '7 วันก่อนหน้า',
    '30d':  '30 วันก่อนหน้า',
    '3m':   '3 เดือนก่อนหน้า',
    '6m':   '6 เดือนก่อนหน้า',
    '1y':   'ปีก่อนหน้า',
    custom: dateFrom && dateTo ? `${dateFrom} ถึง ${dateTo}` : 'กำหนดเอง',
  }[preset] ?? 'ช่วงก่อนหน้า';

  function handleRangeChange({ preset: p, dateFrom: df, dateTo: dt }) {
    setPreset(p);
    setDateFrom(df ?? '');
    setDateTo(dt ?? '');
  }

  return (
    <DashboardLayout activePage="analytics" onNavigate={onNavigate}>
      <div className="flex flex-col gap-6">

        {/* Header row */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">วิเคราะห์ข้อมูล</h2>
            <p className="mt-0.5 text-sm text-gray-400">เปรียบเทียบกับ {presetLabel}</p>
          </div>
          <AnalyticsDateRangePicker
            preset={preset}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={handleRangeChange}
          />
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            label="รถทั้งหมด"
            value={kpi.total_trucks?.value ?? null}
            unit="คัน"
            subtitle={`ช่วงก่อนหน้า ${kpi.total_trucks?.prev ?? '—'} คัน`}
            changePct={kpi.total_trucks?.change_pct ?? null}
            icon={Truck}
            loading={loading}
          />
          <KpiCard
            label="เวลารอเฉลี่ย"
            value={kpi.avg_wait_min?.value ?? null}
            unit="นาที"
            subtitle="CarConfirm − OperatorCarConfirm"
            changePct={kpi.avg_wait_min?.change_pct ?? null}
            icon={Clock}
            loading={loading}
          />
          <KpiCard
            label="เวลาโหลดเฉลี่ย"
            value={kpi.avg_load_min?.value ?? null}
            unit="นาที"
            subtitle="LastPostPallet − FirstPostPallet"
            changePct={kpi.avg_load_min?.change_pct ?? null}
            icon={Timer}
            loading={loading}
          />
          <KpiCard
            label="เวลารวมเฉลี่ย"
            value={kpi.avg_total_min?.value ?? null}
            unit="นาที"
            subtitle="PostingTime − OperatorCarConfirm"
            changePct={kpi.avg_total_min?.change_pct ?? null}
            icon={Hourglass}
            loading={loading}
          />
          <KpiCard
            label="รถใช้เวลาเกิน"
            value={kpi.overtime?.value ?? null}
            unit="คัน"
            subtitle={
              kpi.overtime?.rate != null
                ? `คิดเป็น ${kpi.overtime.rate}% ของช่วงนี้`
                : undefined
            }
            changePct={kpi.overtime?.change_pct ?? null}
            icon={TrendingUp}
            loading={loading}
          />
        </div>

        {/* Charts row 1 — throughput + queue distribution */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ThroughputChart preset={preset} dateFrom={dateFrom} dateTo={dateTo} />
          </div>
          <QueueDistributionChart preset={preset} dateFrom={dateFrom} dateTo={dateTo} />
        </div>

        {/* Charts row 2 — avg time by truck type (pass kpi values as reference lines) */}
        <AvgTimeByQueueChart
          preset={preset}
          dateFrom={dateFrom}
          dateTo={dateTo}
          kpiAvgWait={kpi.avg_wait_min?.value ?? null}
          kpiAvgLoad={kpi.avg_load_min?.value ?? null}
          kpiAvgTotal={kpi.avg_total_min?.value ?? null}
        />

        {/* Charts row 3 — product volume stacked bar */}
        <ProductVolumeChart preset={preset} dateFrom={dateFrom} dateTo={dateTo} />

      </div>
    </DashboardLayout>
  );
}
