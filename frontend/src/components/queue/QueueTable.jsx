import { memo, useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { QUEUE_TYPE_OPTIONS, QUEUE_STATUS_OPTIONS } from '../../constants/queue';
import { normalizeQueueType } from '../../utils/queue/queueTransforms';
import { useTruckQueues } from '../../hooks/queue/useTruckQueues';
import { QueueStatusBadge } from '../common/QueueStatusBadge';
import { WaitingTimeBar } from '../common/WaitingTimeBar';
import { QueueDetailsModal } from '../modal/truckmodal/QueueDetailsModal';
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
          <table className="min-w-300 w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
              <tr>
                <th className="p-3 font-[16px] text-center ">ลำดับ</th>
                <th className="p-3 font-[16px] text-center ">ทะเบียนรถ</th>
                <th className="p-3 font-[16px] text-center">ประเภทคิว</th>
                <th className="p-3 font-[16px] text-center w-45">ชื่อลูกค้า</th>
                <th className="p-3 font-[16px] text-center">ลานจ่าย</th>
                <th className="p-3 font-[16px] text-center w-45">เวลารอ (นาที)</th>
                <th className="p-3 font-[16px] text-center">CPAC</th>
                <th className="p-3 font-[16px] text-center">PRESTIGE</th>
                <th className="p-3 font-[16px] text-center">NEUSTILE</th>
                <th className="p-3 font-[16px] text-center">FITTING</th>
                <th className="p-3 font-[16px] text-center">ACCESSORIES</th>
                <th className="p-3 font-[16px] text-center">สถานะ</th>
              </tr>
            </thead>

            <tbody className="text-gray-700">
              {filteredQueues.map((truck) => (
                <tr
                  key={truck.rowKey}
                  role="button"
                  tabIndex={0}
                  onClick={() => openTruckDetails(truck)}
                  onKeyDown={(event) => handleRowKeyDown(event, truck)}
                  className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                >
                  <td className="p-3 text-center">{truck.sequence}</td>
                  <td className="p-3 text-center">{truck.licensePlate}</td>
                  <td className="p-3 text-center">{normalizeQueueType(truck.queueType) || '-'}</td>
                  <td className="p-3 text-center">{truck.customerName}</td>
                  <td className="p-3 text-center">{truck.postLocationName || '-'}</td>
                  <td className="p-3 text-center">
                    <WaitingTimeBar value={truck.waitingTime} className="mx-auto max-w-35 " />
                  </td>
                  <td className="p-3 text-center">{truck.cpac}</td>
                  <td className="p-3 text-center">{truck.prestige}</td>
                  <td className="p-3 text-center">{truck.neustile}</td>
                  <td className="p-3 text-center">{truck.fitting}</td>
                  <td className="p-3 text-center">{truck.accessories}</td>
                  <td className="p-3 text-center w-30">
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
