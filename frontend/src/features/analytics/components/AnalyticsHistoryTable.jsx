import { memo, useMemo, useState } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { QueueStatusBadge } from '@/features/queue/components/QueueStatusBadge';
import { QueueDetailsModal } from '@/features/queue/components/modal/QueueDetailsModal';
import { normalizeQueueType } from '@/features/queue/utils/queueTransforms';
import { useTruckHistoryData } from '../hooks/useTruckHistoryData';

const LIMIT_OPTIONS = [50, 100, 200, 500];

// แถวจาก backend เป็น snake_case บางช่อง — เติม camelCase ให้ครบ (ใช้ร่วมกับ modal)
function normalizeRow(row) {
  return {
    ...row,
    customerName: row.customerName ?? row.customer_name ?? '',
    postLocationName: row.postLocationName ?? row.post_location_name ?? '',
  };
}

// เวลารวมจริง (นาที) = postingTime − operatorCarConfirm
function totalMinutes(row) {
  const start = row.operatorCarConfirm ?? row.arrivalDate;
  const end = row.postingTime ?? row.exitDate;
  if (!start || !end) return null;
  const diff = (new Date(end) - new Date(start)) / 60000;
  return diff >= 0 ? Math.round(diff) : null;
}

function formatDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('th-TH', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export const AnalyticsHistoryTable = memo(function AnalyticsHistoryTable({ preset, dateFrom, dateTo }) {
  const [limit, setLimit] = useState(100);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTruck, setSelectedTruck] = useState(null);
  // ช่วงวันที่เฉพาะตาราง — ถ้าเลือกครบทั้งคู่จะ override ช่วงของหน้า (custom)
  const [localFrom, setLocalFrom] = useState('');
  const [localTo, setLocalTo] = useState('');

  const useLocalRange = Boolean(localFrom && localTo);
  const effPreset = useLocalRange ? 'custom' : preset;
  const effFrom = useLocalRange ? localFrom : dateFrom;
  const effTo = useLocalRange ? localTo : dateTo;

  const { data, loading, error } = useTruckHistoryData(effPreset, effFrom, effTo, limit);

  const rows = useMemo(() => {
    const list = (data?.trucks ?? []).map(normalizeRow);
    const term = searchTerm.trim().toLowerCase();
    if (!term) return list;
    return list.filter((t) =>
      [t.licensePlate, t.customerName, t.postLocationName]
        .some((v) => String(v ?? '').toLowerCase().includes(term)),
    );
  }, [data, searchTerm]);

  const handleRowKeyDown = (event, truck) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setSelectedTruck(truck);
    }
  };

  return (
    <>
      <div className="flex flex-col w-full max-w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="shrink-0 p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">ประวัติรถย้อนหลัง</h2>
            <p className="mt-0.5 text-xs text-gray-400">
              {loading ? 'กำลังโหลด…' : `${data?.count ?? 0} คันล่าสุดในช่วงที่เลือก`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="ค้นหาทะเบียน / ลูกค้า / ลานจ่าย"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 w-64"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={localFrom}
                max={localTo || undefined}
                onChange={(event) => setLocalFrom(event.target.value)}
                className="border border-gray-200 rounded-md px-2 py-1.5 text-sm text-gray-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <span className="text-sm text-gray-400">ถึง</span>
              <input
                type="date"
                value={localTo}
                min={localFrom || undefined}
                onChange={(event) => setLocalTo(event.target.value)}
                className="border border-gray-200 rounded-md px-2 py-1.5 text-sm text-gray-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              {(localFrom || localTo) && (
                <button
                  type="button"
                  onClick={() => { setLocalFrom(''); setLocalTo(''); }}
                  className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  aria-label="ล้างช่วงวันที่"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="relative inline-block">
              <select
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
                className="appearance-none border border-gray-200 rounded-md px-3 py-1.5 pr-8 text-sm text-gray-600 bg-white hover:bg-gray-50"
              >
                {LIMIT_OPTIONS.map((value) => (
                  <option key={value} value={value}>{value} คันล่าสุด</option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
            </div>
          </div>
        </div>

        <div className="queue-scrollbar relative max-h-[600px] overflow-auto">
          {error ? (
            <div className="flex items-center justify-center py-16 text-sm text-red-500">{error}</div>
          ) : (
            <table aria-label="ตารางประวัติรถ" className="table-fixed w-full min-w-290 text-left text-xs">
              <colgroup>
                <col className="w-12" />
                <col className="w-32" />
                <col className="w-20" />
                <col className="w-18" />
                <col className="w-40" />
                <col className="w-36" />
                <col className="w-20" />
                <col className="w-14" />
                <col className="w-18" />
                <col className="w-18" />
                <col className="w-16" />
                <col className="w-22" />
                <col className="w-24" />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                <tr>
                  <th scope="col" className="p-3 text-center whitespace-nowrap">ลำดับ</th>
                  <th scope="col" className="p-3 text-center whitespace-nowrap">วันที่-เวลาเข้า</th>
                  <th scope="col" className="p-3 text-center whitespace-nowrap">ทะเบียนรถ</th>
                  <th scope="col" className="p-3 text-center whitespace-nowrap">ประเภทคิว</th>
                  <th scope="col" className="p-3 text-center whitespace-nowrap">ชื่อลูกค้า</th>
                  <th scope="col" className="p-3 text-center whitespace-nowrap">ลานจ่าย</th>
                  <th scope="col" className="p-3 text-center whitespace-nowrap">เวลารวม (นาที)</th>
                  <th scope="col" className="p-3 text-center whitespace-nowrap">CPAC</th>
                  <th scope="col" className="p-3 text-center whitespace-nowrap">PRESTIGE</th>
                  <th scope="col" className="p-3 text-center whitespace-nowrap">NEUSTILE</th>
                  <th scope="col" className="p-3 text-center whitespace-nowrap">FITTING</th>
                  <th scope="col" className="p-3 text-center whitespace-nowrap">ACCESSORIES</th>
                  <th scope="col" className="p-3 text-center whitespace-nowrap">สถานะ</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {rows.map((truck, index) => {
                  const total = totalMinutes(truck);
                  return (
                    <tr
                      key={`${truck.truckSeqNo ?? truck.sequence}-${truck.packListNo ?? index}`}
                      role="button"
                      tabIndex={0}
                      aria-label={`ดูรายละเอียดรถ ${truck.licensePlate ?? ''}`.trim()}
                      onClick={() => setSelectedTruck(truck)}
                      onKeyDown={(event) => handleRowKeyDown(event, truck)}
                      className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                    >
                      <td className="p-3 text-center whitespace-nowrap">{index + 1}</td>
                      <td className="p-3 text-center whitespace-nowrap">{formatDateTime(truck.arrivalDate ?? truck.operatorCarConfirm)}</td>
                      <td className="p-3 text-center whitespace-nowrap overflow-hidden">
                        <div className="truncate" title={truck.licensePlate}>{truck.licensePlate}</div>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap overflow-hidden">
                        <div className="truncate" title={normalizeQueueType(truck.queueType) || '-'}>{normalizeQueueType(truck.queueType) || '-'}</div>
                      </td>
                      <td className="p-3 text-center overflow-hidden">
                        <div className="truncate" title={truck.customerName}>{truck.customerName || '-'}</div>
                      </td>
                      <td className="p-3 text-center overflow-hidden">
                        <div className="truncate leading-5" title={truck.postLocationName || '-'}>{truck.postLocationName || '-'}</div>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap font-medium text-gray-800">{total ?? '-'}</td>
                      <td className="p-3 text-center whitespace-nowrap">{truck.cpac}</td>
                      <td className="p-3 text-center whitespace-nowrap">{truck.prestige}</td>
                      <td className="p-3 text-center whitespace-nowrap">{truck.neustile}</td>
                      <td className="p-3 text-center whitespace-nowrap">{truck.fitting}</td>
                      <td className="p-3 text-center whitespace-nowrap">{truck.accessories}</td>
                      <td className="p-3 text-center">
                        <QueueStatusBadge status={truck.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {!error && !loading && rows.length === 0 && (
            <div className="flex items-center justify-center py-16 text-sm text-gray-500">ไม่มีข้อมูลรถ</div>
          )}
        </div>
      </div>

      {selectedTruck ? (
        <QueueDetailsModal queue={selectedTruck} onClose={() => setSelectedTruck(null)} />
      ) : null}
    </>
  );
});
