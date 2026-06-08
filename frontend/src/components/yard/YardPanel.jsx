import { memo } from 'react';
import { ChevronDown } from 'lucide-react';
import { YARD_FILTERS, YARD_STATUSES } from '../../constants/yard';
import { EmptySlotModal } from '../modal/yardmodal/EmptySlotModal';
import { YardDetailsModal } from '../modal/yardmodal/YardDetailsModal';
import { useYardPanel } from '../../hooks/yard/useYardPanel';
import { ZoneSection } from './ZoneSection';


export const YardPanel = memo(function YardPanel({ zones = [] }) {
  const {
    statusFilter,
    setStatusFilter,
    filteredZones,
    selectedBay,
    handleSelectBay,
    handleCloseModal,
  } = useYardPanel(zones);

  return (
    <div className="flex h-full min-h-0 w-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:p-5">
      <div className="mb-3 flex shrink-0 items-center justify-between border-b border-gray-100 pb-4">
        <h2 className="text-lg font-bold text-gray-800">ลานจ่าย</h2>

        <div className="relative inline-block">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="appearance-none rounded-md border border-gray-200 bg-white px-3 py-1.5 pr-8 text-sm text-gray-600 hover:bg-gray-50"
          >
            <option value={YARD_FILTERS.all}>ลานจ่ายทั้งหมด</option>
            <option value={YARD_FILTERS.loading}>กำลังโหลด</option>
            <option value={YARD_FILTERS.available}>ว่าง</option>
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
        </div>
      </div>

      <div className="queue-scrollbar -mr-3 min-h-0 flex-1 space-y-6 overflow-y-auto pr-3 lg:-mr-4 lg:pr-4">
        {filteredZones.length > 0 ? (
          filteredZones.map((zone) => (
            <ZoneSection key={zone.id} zone={zone} onSelectBay={handleSelectBay} />
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm font-medium text-gray-500">
            ไม่พบลานจ่ายตามสถานะที่เลือก
          </div>
        )}
      </div>
      
      {/* เลือกช่องสถานะว่าง เปิด Modal ลานว่าง */}
      {selectedBay?.status === YARD_STATUSES.available ? (
        <EmptySlotModal isOpen onClose={handleCloseModal} />
      ) : null}

      {/* เลือกช่องกำลังโหลด เปิด Modal รายละเอียด */}
      {selectedBay && selectedBay.status !== YARD_STATUSES.available ? (
        <YardDetailsModal bay={selectedBay} isOpen onClose={handleCloseModal} />
      ) : null}
    </div>
  );
});
