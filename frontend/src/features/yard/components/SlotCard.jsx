import { memo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import ForkliftIcon from '@mui/icons-material/Forklift';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { WaitingTimeBar } from '../../../shared/components/WaitingTimeBar';
import { YardSlotStatusBadge } from '../../../shared/components/YardSlotStatusBadge';
import { useSlotCard } from '../hooks/useSlotCard';
import { SlotResourceIcons } from './SlotResourceIcons';

export const SlotCard = memo(function SlotCard({ bay, onSelect }) {
  const {
    isAvailable,
    style,
    forkliftCount,
    truckCount,
    hasResourceRows,
    forkliftDriverTitles,
    waitingTimeTextClassName,
    handleSelect,
  } = useSlotCard(bay, onSelect);

  // ถ้าว่าง เเสดงช่องจ่ายว่าง
  if (isAvailable) {
    return (
      <button
        type="button"
        onClick={handleSelect}
        className={`flex min-h-38 w-full cursor-pointer flex-col rounded-xl border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${style.container}`}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-800">{bay.name}</span>
          <YardSlotStatusBadge status={bay.status} label={bay.statusLabel} />
        </div>

        <div className={`flex flex-1 flex-col items-center justify-center gap-2 ${style.icon}`}>
          <CheckCircle2 size={28} strokeWidth={2} />
          <span className="text-xs font-bold">{bay.statusLabel || 'ว่าง'}</span>
        </div>
      </button>
    );
  }

  // ถ้าไม่ว่าง เเสดงข้อมูลช่องจ่ายที่กำลังใช้งานอยู่
  return (
    <button
      type="button"
      onClick={handleSelect}
      className={`flex min-h-38 w-full cursor-pointer flex-col rounded-xl border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${style.container}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-sm font-bold text-gray-800">{bay.name}</div>

        <YardSlotStatusBadge status={bay.status} label={bay.statusLabel} />
      </div>

      <div className="mt-3 flex flex-1 flex-col gap-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-[12px] font-medium text-gray-600">
              {bay.assignedTruckId || '-'}
            </div>
          </div>

          <WaitingTimeBar value={bay.waitingTime} variant="compact" showUnit />

          <div className="flex items-center justify-between gap-2">
            <span className={`truncate text-[12px] font-medium ${waitingTimeTextClassName}`}>
              {bay.waitingTime} นาที
            </span>
          </div>
        </div>

        {hasResourceRows ? (
          <div className={`mt-auto space-y-1 pt-1 ${style.icon}`}>
            {forkliftCount > 0 ? (
              <div className={`flex items-center gap-1.5 ${style.icon}`}>
                <SlotResourceIcons
                  icon={ForkliftIcon}
                  count={forkliftCount}
                  keyPrefix={`${bay.id}-forklift`}
                  titles={forkliftDriverTitles}
                />
              </div>
            ) : null}

            {truckCount > 0 ? (
              <div className={`flex items-center gap-1.5 ${style.icon}`} title="จำนวนรถในช่องจ่าย">
                <SlotResourceIcons
                  icon={LocalShippingIcon}
                  count={truckCount}
                  keyPrefix={`${bay.id}-truck`}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </button>
  );
});
