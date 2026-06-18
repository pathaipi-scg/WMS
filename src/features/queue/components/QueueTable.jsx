import { memo, useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { QUEUE_TYPE_OPTIONS, QUEUE_STATUS_OPTIONS } from '../constants';
import { normalizeQueueType } from '../utils/queueTransforms';
import { useTruckQueues } from '../hooks/useTruckQueues';
import { QueueStatusBadge } from './QueueStatusBadge';
import { WaitingTimeBar } from '../../../shared/components/WaitingTimeBar';
import { QueueDetailsModal } from './modal/QueueDetailsModal';
// Component สำหรับแสดงตารางคิวรถ

export const QueueTable = memo(function QueueTable({ queues = [] }) {
  const [selectedTruck, setSelectedTruck] = useState(null);
  const {
    filteredQueues,
    searchTerm,
    setSearchTerm,
    queueTypeFilter,
    setQueueTypeFilter,
    statusFilter,
    setStatusFilter,
  } = useTruckQueues(queues);

  const openTruckDetails = (truck) => setSelectedTruck(truck);

  const handleRowKeyDown = (event, truck) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openTruckDetails(truck);
    }
  };

  return (
    <>
      <div className="flex flex-col h-full w-full max-w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="shrink-0 p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-lg font-bold text-gray-800">คิวรถ</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="ค้นหาทะเบียนรถ"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 w-64"
              />
            </div>
            <div className="relative inline-block">
              <select
                value={queueTypeFilter}
                onChange={(event) => setQueueTypeFilter(event.target.value)}
                className="appearance-none border border-gray-200 rounded-md px-3 py-1.5 pr-8 text-sm text-gray-600 bg-white hover:bg-gray-50"
              >
                {QUEUE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
            </div>
            <div className="relative inline-block">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="appearance-none border border-gray-200 rounded-md px-3 py-1.5 pr-8 text-sm text-gray-600 bg-white hover:bg-gray-50"
              >
                {QUEUE_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
            </div>
          </div>
        </div>
        <div className="queue-scrollbar relative flex-1 min-h-0 overflow-auto">
          <table aria-label="ตารางคิวรถ" className="table-fixed w-full min-w-290 text-left text-xs">
            <colgroup>
              <col className="w-12" />
              <col className="w-20" />
              <col className="w-18" />
              <col className="w-40" />
              <col className="w-40" />
              <col className="w-36" />
              <col className="w-22" />
              <col className="w-14" />
              <col className="w-18" />
              <col className="w-18" />
              <col className="w-16" />
              <col className="w-22" />
              <col className="w-28" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
              <tr>
                <th scope="col" className="p-3 text-center whitespace-nowrap">ลำดับ</th>
                <th scope="col" className="p-3 text-center whitespace-nowrap">ทะเบียนรถ</th>
                <th scope="col" className="p-3 text-center whitespace-nowrap">ประเภทคิว</th>
                <th scope="col" className="p-3 text-center whitespace-nowrap">ชื่อลูกค้า</th>
                <th scope="col" className="p-3 text-center whitespace-nowrap">ลานจ่าย</th>
                <th scope="col" className="p-3 text-center whitespace-nowrap">เวลารอ (นาที)</th>
                <th scope="col" className="p-3 text-center whitespace-nowrap">คาดว่าเสร็จ</th>
                <th scope="col" className="p-3 text-center whitespace-nowrap">CPAC</th>
                <th scope="col" className="p-3 text-center whitespace-nowrap">PRESTIGE</th>
                <th scope="col" className="p-3 text-center whitespace-nowrap">NEUSTILE</th>
                <th scope="col" className="p-3 text-center whitespace-nowrap">FITTING</th>
                <th scope="col" className="p-3 text-center whitespace-nowrap">ACCESSORIES</th>
                <th scope="col" className="p-3 text-center whitespace-nowrap">สถานะ</th>
              </tr>
            </thead>

            <tbody className="text-gray-700">
              {filteredQueues.map((truck) => (
                <tr
                  key={truck.rowKey}
                  role="button"
                  tabIndex={0}
                  aria-label={`ดูรายละเอียดคิวรถ ${truck.licensePlate ?? ''}`.trim()}
                  onClick={() => openTruckDetails(truck)}
                  onKeyDown={(event) => handleRowKeyDown(event, truck)}
                  className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                >
                  <td className="p-3 text-center whitespace-nowrap">
                    <div className="inline-flex items-center justify-center gap-1.5">
                      {truck.predictedTotalTimeMin > 120 && (
                        <span
                          className="inline-block h-2 w-2 rounded-full bg-red-500 shrink-0"
                          title={`คาดว่าใช้เวลา ${Math.round(truck.predictedTotalTimeMin)} นาที`}
                        />
                      )}
                      {truck.sequence}
                    </div>
                  </td>
                  <td className="p-3 text-center whitespace-nowrap overflow-hidden">
                    <div className="truncate" title={truck.licensePlate}>{truck.licensePlate}</div>
                  </td>
                  <td className="p-3 text-center whitespace-nowrap overflow-hidden">
                    <div className="truncate" title={normalizeQueueType(truck.queueType) || '-'}>{normalizeQueueType(truck.queueType) || '-'}</div>
                  </td>
                  <td className="p-3 text-center overflow-hidden">
                    <div className="truncate" title={truck.customerName}>{truck.customerName}</div>
                  </td>
                  <td className="p-3 text-center overflow-hidden">
                    <div className="truncate leading-5" title={truck.postLocationName || '-'}>{truck.postLocationName || '-'}</div>
                  </td>
                  <td className="p-3 text-center">
                    <WaitingTimeBar value={truck.waitingTime} className="mx-auto" />
                  </td>
                  <td className="p-3 text-center font-medium text-blue-700 whitespace-nowrap">
                    {truck.predictedFinishTime
                      ? new Date(truck.predictedFinishTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.'
                      : '-'}
                  </td>
                  <td className="p-3 text-center whitespace-nowrap">{truck.cpac}</td>
                  <td className="p-3 text-center whitespace-nowrap">{truck.prestige}</td>
                  <td className="p-3 text-center whitespace-nowrap">{truck.neustile}</td>
                  <td className="p-3 text-center whitespace-nowrap">{truck.fitting}</td>
                  <td className="p-3 text-center whitespace-nowrap">{truck.accessories}</td>
                  <td className="p-3 text-center">
                    <QueueStatusBadge status={truck.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ถ้าไม่มีข้อมูล เเสดงผลว่าง ไม่มีคิว */}
          {filteredQueues.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center text-sm text-gray-500">
                <span>ไม่มีคิวรถ</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* แสดง Modal รายละเอียดคิว */}
      {selectedTruck ? (
        <QueueDetailsModal queue={selectedTruck} onClose={() => setSelectedTruck(null)} />
      ) : null}
    </>
  );
});
