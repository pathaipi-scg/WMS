import { useState } from 'react';
import { AlertCircle, Clock, Hourglass, LogIn, LogOut, Timer, TrendingUp, Truck } from 'lucide-react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { ConnectionStatusBanner } from '../shared/components/feedback/ConnectionStatusBanner';
import {
  AnalyticsDateRangePicker, KpiCard,
  ThroughputChart, HourlyInOutChart, ProductVolumeChart,
  TimeDistributionChart, PhaseBoxPlotPair, LanePhaseBreakdownChart,
  AnalyticsHistoryTable,
  // ปิดการแสดงผลชั่วคราว (คอมเมนต์ไว้ ไม่ลบ): AvgTimeByQueueChart
  // AvgTimeByQueueChart,
  // ปิดการแสดงผลชั่วคราว (คอมเมนต์ไว้ ไม่ลบ): QueueDistributionChart, NotificationSummaryChart
  // QueueDistributionChart, NotificationSummaryChart,
  useKpiData, usePhaseDistributionData,
  AnalyticsRealtimeProvider, useAnalyticsRealtimeContext,
} from '../features/analytics';

// 5 ช่วงเวลาในวงจรรถ (key ตรงกับ backend) + ชื่อแสดงผล
const PHASE_ITEMS = [
  { key: 'wait_call',  title: 'เวลารอเรียก' },
  { key: 'wait_load',  title: 'เวลารอโหลด' },
  { key: 'load',       title: 'เวลาโหลด' },
  { key: 'wait_close', title: 'เวลารอปิดงาน' },
  { key: 'wait_post',  title: 'เวลารอ post' },
];

export function AnalyticsPage() {
  const [preset, setPreset] = useState('today');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  function handleRangeChange({ preset: p, dateFrom: df, dateTo: dt }) {
    setPreset(p);
    setDateFrom(df ?? '');
    setDateTo(dt ?? '');
  }

  // Provider เปิด WebSocket "วันนี้" ครั้งเดียว แล้วแชร์ให้ data hook ทุกตัวในหน้า
  return (
    <AnalyticsRealtimeProvider preset={preset}>
      <AnalyticsPageContent
        preset={preset}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onRangeChange={handleRangeChange}
      />
    </AnalyticsRealtimeProvider>
  );
}

function AnalyticsPageContent({ preset, dateFrom, dateTo, onRangeChange }) {
  const isToday = preset === 'today';
  const { connectionStatus } = useAnalyticsRealtimeContext();

  const { data, loading, error } = useKpiData(preset, dateFrom, dateTo);
  const kpi = data?.kpi ?? {};

  // ดึงการกระจายเวลา 5 ช่วง (แยกชนิดรถ) ครั้งเดียวต่อ group_by แล้วแบ่งให้แต่ละคู่
  const phaseDaily = usePhaseDistributionData(preset, 'day', dateFrom, dateTo);
  const phaseHourly = usePhaseDistributionData(preset, 'hour', dateFrom, dateTo);
  const phaseLoading = phaseDaily.loading || phaseHourly.loading;
  const phaseError = phaseDaily.error || phaseHourly.error;

  const presetLabel = {
    today:  'เมื่อวาน',
    '7d':   '7 วันก่อนหน้า',
    '30d':  '30 วันก่อนหน้า',
    '3m':   '3 เดือนก่อนหน้า',
    '6m':   '6 เดือนก่อนหน้า',
    '1y':   'ปีก่อนหน้า',
    custom: dateFrom && dateTo ? `${dateFrom} ถึง ${dateTo}` : 'กำหนดเอง',
  }[preset] ?? 'ช่วงก่อนหน้า';

  // label สั้นสำหรับ KPI card subtitle (กันข้อความล้นเมื่อเลือก custom date)
  const presetShortLabel = preset === 'custom' ? 'ช่วงก่อนหน้า' : presetLabel;

  return (
    <DashboardLayout showNotifications={false}>
      <ConnectionStatusBanner status={isToday ? connectionStatus : 'open'} />
      <div className="flex flex-col gap-6 pb-5">

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
            onChange={onRangeChange}
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
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <KpiCard
            label="รถทั้งหมด"
            value={kpi.total_trucks?.value ?? null}
            unit="คัน"
            subtitle={`${presetShortLabel} ${kpi.total_trucks?.prev ?? '—'} คัน`}
            changePct={kpi.total_trucks?.change_pct ?? null}
            icon={Truck}
            loading={loading}
          />
          <KpiCard
            label="เวลารอเฉลี่ย"
            value={kpi.avg_wait_min?.value ?? null}
            unit="นาที"
            subtitle={`${presetShortLabel} ${kpi.avg_wait_min?.prev ?? '—'} นาที`}
            changePct={kpi.avg_wait_min?.change_pct ?? null}
            icon={Clock}
            loading={loading}
          />
          <KpiCard
            label="เวลาโหลดเฉลี่ย"
            value={kpi.avg_load_min?.value ?? null}
            unit="นาที"
            subtitle={`${presetShortLabel} ${kpi.avg_load_min?.prev ?? '—'} นาที`}
            changePct={kpi.avg_load_min?.change_pct ?? null}
            icon={Timer}
            loading={loading}
          />
          <KpiCard
            label="เวลารวมเฉลี่ย"
            value={kpi.avg_total_min?.value ?? null}
            unit="นาที"
            subtitle={`${presetShortLabel} ${kpi.avg_total_min?.prev ?? '—'} นาที`}
            changePct={kpi.avg_total_min?.change_pct ?? null}
            icon={Hourglass}
            loading={loading}
          />
          <KpiCard
            label="รถใช้เวลาเกิน"
            value={kpi.overtime?.value ?? null}
            unit="คัน"
            subtitle={`${presetShortLabel} ${kpi.overtime?.prev ?? '—'} คัน`}
            changePct={kpi.overtime?.change_pct ?? null}
            icon={TrendingUp}
            loading={loading}
          />
          <KpiCard
            label="เวลาคันแรกแตะบัตร"
            value={kpi.first_picking?.value ?? null}
            unit="น."
            subtitle={`${presetShortLabel} ${kpi.first_picking?.prev ?? '—'} น.`}
            changePct={kpi.first_picking?.change_pct ?? null}
            icon={LogIn}
            loading={loading}
            showChange={false}
          />
          <KpiCard
            label="เวลาคันสุดท้ายออก"
            value={kpi.last_posting?.value ?? null}
            unit="น."
            subtitle={`${presetShortLabel} ${kpi.last_posting?.prev ?? '—'} น.`}
            changePct={kpi.last_posting?.change_pct ?? null}
            icon={LogOut}
            loading={loading}
            showChange={false}
          />
        </div>

        {/* Charts row 1 — ซ้าย: ปริมาณรถเข้า (แยกประเภทรถ) · ขวา: รถเข้า/ออก รายชั่วโมง วางคู่กัน */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <ThroughputChart preset={preset} dateFrom={dateFrom} dateTo={dateTo} />
          <HourlyInOutChart preset={preset} dateFrom={dateFrom} dateTo={dateTo} />
        </div>

        {/* ปิดการแสดงผลชั่วคราว (คอมเมนต์ไว้ ไม่ลบ) — กราฟสัดส่วนประเภทคิว + จำนวนการแจ้งเตือน
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <QueueDistributionChart preset={preset} dateFrom={dateFrom} dateTo={dateTo} />
          <NotificationSummaryChart preset={preset} dateFrom={dateFrom} dateTo={dateTo} />
        </div>
        */}

        {/* Charts row 2 — การกระจายเวลารวม (box plot) วางคู่กัน: รายวัน | รายชั่วโมง */}
        <TimeDistributionChart preset={preset} dateFrom={dateFrom} dateTo={dateTo} />

        {/* Charts row 3–7 — box plot แยกชนิดรถ ของ 5 ช่วงเวลา (คู่ละ รายวัน | รายชั่วโมง) */}
        {PHASE_ITEMS.map(({ key, title }) => (
          <PhaseBoxPlotPair
            key={key}
            title={title}
            dailyRows={phaseDaily.data?.phases?.[key]?.data ?? []}
            hourlyRows={phaseHourly.data?.phases?.[key]?.data ?? []}
            loading={phaseLoading}
            error={phaseError}
          />
        ))}

        {/* ปิดการแสดงผลชั่วคราว (คอมเมนต์ไว้ ไม่ลบ) — เวลาเฉลี่ยแยกตามประเภทรถ
        <AvgTimeByQueueChart
          preset={preset}
          dateFrom={dateFrom}
          dateTo={dateTo}
          kpiAvgWait={kpi.avg_wait_min?.value ?? null}
          kpiAvgLoad={kpi.avg_load_min?.value ?? null}
          kpiAvgTotal={kpi.avg_total_min?.value ?? null}
        />
        */}

        {/* เวลาเฉลี่ย 5 ช่วง แยกตามลานจอด (stacked bar) */}
        <LanePhaseBreakdownChart preset={preset} dateFrom={dateFrom} dateTo={dateTo} />

        {/* Charts row 3 — product volume stacked bar */}
        <ProductVolumeChart preset={preset} dateFrom={dateFrom} dateTo={dateTo} />

        {/* ตารางประวัติรถย้อนหลัง (เหมือนหน้าแรก แต่เก็บทุกคัน) — ล่างสุด */}
        <AnalyticsHistoryTable preset={preset} dateFrom={dateFrom} dateTo={dateTo} />

      </div>
    </DashboardLayout>
  );
}
