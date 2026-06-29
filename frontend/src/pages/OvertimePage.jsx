import { memo, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { AlertCircle, AlertTriangle, Clock, Gauge, Percent, TrendingUp } from 'lucide-react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import {
  AnalyticsDateRangePicker, KpiCard, ChartCard, useOvertimeData,
} from '../features/analytics';
import { QueueStatusBadge } from '@/features/queue/components/QueueStatusBadge';
import { QueueDetailsModal } from '@/features/queue/components/modal/QueueDetailsModal';
import { normalizeQueueType } from '@/features/queue/utils/queueTransforms';

const PHASE_LABELS = {
  wait_call: 'รอเรียก',
  wait_load: 'รอโหลด',
  load: 'โหลด',
  wait_close: 'รอปิดงาน',
  wait_post: 'รอ post',
};

const TYPE_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#dc2626', '#9ca3af'];
const CHART_MARGIN = { top: 8, right: 8, left: -16, bottom: 0 };

function normalizeRow(row) {
  return {
    ...row,
    customerName: row.customerName ?? row.customer_name ?? '',
    postLocationName: row.postLocationName ?? row.post_location_name ?? '',
  };
}

function formatDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('th-TH', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

// กราฟเทียบเวลาเฉลี่ยแต่ละช่วง: รถเกินเวลา vs รถปกติ
function PhaseCompareChart({ byPhase, loading, error }) {
  const rows = (byPhase ?? []).map((p) => ({
    phase: PHASE_LABELS[p.phase] ?? p.phase,
    overtime_avg: p.overtime_avg ?? 0,
    ontime_avg: p.ontime_avg ?? 0,
  }));

  return (
    <ChartCard
      title="เวลาเฉลี่ยแต่ละช่วง · รถเกินเวลา เทียบ รถปกติ"
      subtitle={loading ? undefined : 'นาที — ดูว่ารถเกินเวลาเสียเวลาช่วงไหนมากที่สุด'}
      loading={loading}
      error={error}
      height={300}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={CHART_MARGIN} barGap={4} barCategoryGap="25%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis dataKey="phase" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} unit=" น." />
          <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} formatter={(v) => [`${v} น.`]} />
          <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          <Bar dataKey="ontime_avg" name="รถปกติ" fill="#94a3b8" maxBarSize={28} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="overtime_avg" name="รถเกินเวลา" fill="#ef4444" maxBarSize={28} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// กราฟจำนวนรถเกินเวลา แยกตามประเภทรถ
function TruckTypeChart({ byTruckType, loading, error }) {
  const rows = (byTruckType ?? []).filter((t) => t.count > 0);

  return (
    <ChartCard
      title="จำนวนรถเกินเวลา · แยกตามประเภทรถ"
      subtitle={loading ? undefined : 'คัน'}
      loading={loading}
      error={error}
      height={300}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={CHART_MARGIN} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis dataKey="truck_type" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} unit=" คัน" />
          <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} formatter={(v) => [`${v} คัน`, 'จำนวน']} />
          <Bar dataKey="count" name="จำนวน" maxBarSize={64} radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {rows.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function OvertimeTable({ trucks, threshold, loading, error }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTruck, setSelectedTruck] = useState(null);

  const rows = useMemo(() => {
    const list = (trucks ?? []).map(normalizeRow);
    const term = searchTerm.trim().toLowerCase();
    if (!term) return list;
    return list.filter((t) =>
      [t.licensePlate, t.customerName, t.postLocationName]
        .some((v) => String(v ?? '').toLowerCase().includes(term)),
    );
  }, [trucks, searchTerm]);

  return (
    <>
      <div className="flex flex-col w-full max-w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="shrink-0 p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">รายการรถใช้เวลาเกิน</h2>
            <p className="mt-0.5 text-xs text-gray-400">
              {loading ? 'กำลังโหลด…' : `${rows.length} คัน · เกณฑ์ ${threshold ?? 120} นาที`}
            </p>
          </div>
          <input
            type="text"
            placeholder="ค้นหาทะเบียน / ลูกค้า / ลานจ่าย"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 w-64"
          />
        </div>

        <div className="queue-scrollbar relative max-h-[560px] overflow-auto">
          {error ? (
            <div className="flex items-center justify-center py-16 text-sm text-red-500">{error}</div>
          ) : (
            <table aria-label="ตารางรถใช้เวลาเกิน" className="table-fixed w-full min-w-250 text-left text-xs">
              <colgroup>
                <col className="w-12" /><col className="w-32" /><col className="w-20" /><col className="w-18" />
                <col className="w-40" /><col className="w-36" /><col className="w-24" /><col className="w-24" /><col className="w-24" />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                <tr>
                  <th className="p-3 text-center whitespace-nowrap">ลำดับ</th>
                  <th className="p-3 text-center whitespace-nowrap">วันที่-เวลาเข้า</th>
                  <th className="p-3 text-center whitespace-nowrap">ทะเบียนรถ</th>
                  <th className="p-3 text-center whitespace-nowrap">ประเภทคิว</th>
                  <th className="p-3 text-center whitespace-nowrap">ชื่อลูกค้า</th>
                  <th className="p-3 text-center whitespace-nowrap">ลานจ่าย</th>
                  <th className="p-3 text-center whitespace-nowrap">เวลารวม (นาที)</th>
                  <th className="p-3 text-center whitespace-nowrap">เกินกำหนด (นาที)</th>
                  <th className="p-3 text-center whitespace-nowrap">สถานะ</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {rows.map((truck, index) => {
                  const total = truck.totalMin ?? null;
                  const over = total != null ? total - (threshold ?? 120) : null;
                  return (
                    <tr
                      key={`${truck.truckSeqNo ?? truck.sequence}-${truck.packListNo ?? index}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedTruck(truck)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedTruck(truck); } }}
                      className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                    >
                      <td className="p-3 text-center whitespace-nowrap">{index + 1}</td>
                      <td className="p-3 text-center whitespace-nowrap">{formatDateTime(truck.arrivalDate ?? truck.operatorCarConfirm)}</td>
                      <td className="p-3 text-center whitespace-nowrap overflow-hidden"><div className="truncate" title={truck.licensePlate}>{truck.licensePlate}</div></td>
                      <td className="p-3 text-center whitespace-nowrap overflow-hidden"><div className="truncate">{normalizeQueueType(truck.queueType) || '-'}</div></td>
                      <td className="p-3 text-center overflow-hidden"><div className="truncate" title={truck.customerName}>{truck.customerName || '-'}</div></td>
                      <td className="p-3 text-center overflow-hidden"><div className="truncate" title={truck.postLocationName}>{truck.postLocationName || '-'}</div></td>
                      <td className="p-3 text-center whitespace-nowrap font-bold text-red-600">{total ?? '-'}</td>
                      <td className="p-3 text-center whitespace-nowrap font-medium text-orange-600">{over != null ? `+${over}` : '-'}</td>
                      <td className="p-3 text-center"><QueueStatusBadge status={truck.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {!error && !loading && rows.length === 0 && (
            <div className="flex items-center justify-center py-16 text-sm text-gray-500">ไม่มีรถที่ใช้เวลาเกิน</div>
          )}
        </div>
      </div>

      {selectedTruck ? <QueueDetailsModal queue={selectedTruck} onClose={() => setSelectedTruck(null)} /> : null}
    </>
  );
}

export const OvertimePage = memo(function OvertimePage() {
  const [preset, setPreset] = useState('today');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, loading, error } = useOvertimeData(preset, dateFrom, dateTo);
  const summary = data?.summary ?? {};

  function handleRangeChange({ preset: p, dateFrom: df, dateTo: dt }) {
    setPreset(p);
    setDateFrom(df ?? '');
    setDateTo(dt ?? '');
  }

  return (
    <DashboardLayout showNotifications={false}>
      <div className="flex flex-col gap-6 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              รถใช้เวลาเกิน {data?.threshold ?? 120} นาที
            </h2>
            <p className="mt-0.5 text-sm text-gray-400">รถที่ใช้เวลารวม (เข้า → ออก) เกินเกณฑ์ที่กำหนด</p>
          </div>
          <AnalyticsDateRangePicker preset={preset} dateFrom={dateFrom} dateTo={dateTo} onChange={handleRangeChange} />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />{error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <KpiCard label="รถเกินเวลา" value={summary.overtime_count ?? null} unit="คัน" icon={TrendingUp} loading={loading} showChange={false} />
          <KpiCard label="อัตราเกินเวลา" value={summary.overtime_rate ?? null} unit="%" icon={Percent} loading={loading} showChange={false} />
          <KpiCard label="เวลารวมเฉลี่ย" value={summary.avg_total_min ?? null} unit="นาที" icon={Clock} loading={loading} showChange={false} />
          <KpiCard label="เกินกำหนดเฉลี่ย" value={summary.avg_overshoot_min ?? null} unit="นาที" icon={Gauge} loading={loading} showChange={false} />
          <KpiCard label="เวลารวมสูงสุด" value={summary.max_total_min ?? null} unit="นาที" icon={AlertTriangle} loading={loading} showChange={false} />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <PhaseCompareChart byPhase={data?.by_phase} loading={loading} error={error} />
          <TruckTypeChart byTruckType={data?.by_truck_type} loading={loading} error={error} />
        </div>

        <OvertimeTable trucks={data?.trucks} threshold={data?.threshold} loading={loading} error={error} />
      </div>
    </DashboardLayout>
  );
});
