import { memo, useEffect, useRef, useState } from 'react';
import { CircleUserRound, Clock3, Flag, Package2, Warehouse } from 'lucide-react';
import { buildYardDetailsViewModel } from '../../utils/yardDetailsModel';
import { YardSlotStatusBadge } from '../../../../shared/components/YardSlotStatusBadge';
import { BottomSheet } from '../../../../shared/components/BottomSheet';
import { ModalIconHeader } from '../../../../shared/components/ModalIconHeader';
import { InfoSection } from '../../../../shared/components/InfoSection';

export const YardDetailsModal = memo(function YardDetailsModal({ bay, isOpen, onClose }) {
  const details = bay ? buildYardDetailsViewModel(bay) : null;
  const leftColumnRef = useRef(null);
  const [leftColumnHeight, setLeftColumnHeight] = useState(null);

  useEffect(() => {
    if (!isOpen || !leftColumnRef.current) {
      return undefined;
    }

    const updateLeftColumnHeight = () => {
      setLeftColumnHeight(leftColumnRef.current?.getBoundingClientRect().height ?? null);
    };

    updateLeftColumnHeight();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateLeftColumnHeight);
      return () => window.removeEventListener('resize', updateLeftColumnHeight);
    }

    const resizeObserver = new ResizeObserver(updateLeftColumnHeight);
    resizeObserver.observe(leftColumnRef.current);
    window.addEventListener('resize', updateLeftColumnHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateLeftColumnHeight);
    };
  }, [isOpen, details?.customerName, details?.productItems.length]);

  if (!bay || !details) {
    return null;
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <ModalIconHeader
        icon={<Warehouse size={24} strokeWidth={2} />}
        left={
          <div className="min-w-0">
            <div className="text-[25px] font-bold leading-tight text-slate-900">{details.title}</div>
            <div className="mt-2 text-sm font-semibold text-slate-600">
              รถเข้ารับบริการ: {details.assignedTruckLabel}
            </div>
          </div>
        }
        right={<YardSlotStatusBadge status={bay.status} label={bay.statusLabel} size="lg" />}
      />

      <div
        className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-12 xl:items-start"
        style={leftColumnHeight ? { '--yard-detail-column-height': `${leftColumnHeight}px` } : undefined}
      >
        <section ref={leftColumnRef} className="space-y-4 xl:col-span-3">
          <InfoSection>
            <div className="flex gap-4">
              <div className="mt-0.5 text-slate-700">
                <CircleUserRound size={24} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <div className="text-md font-bold text-slate-900">ลูกค้า</div>
                <div className="queue-scrollbar mt-3 max-h-20 overflow-y-auto pr-2 text-sm text-slate-600">
                  {details.customerName}
                </div>
              </div>
            </div>
          </InfoSection>

          <InfoSection>
            <div className="flex gap-4">
              <div className="mt-0.5 text-slate-700">
                <Package2 size={24} strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-md font-bold text-slate-900">รายละเอียดสินค้า</div>
                <div className="queue-scrollbar mt-3 flex max-h-65 flex-col overflow-y-auto pr-2">
                  {details.productItems.map((product) => (
                    <div
                      key={product.label}
                      className="flex min-h-8 items-center justify-between gap-4 text-sm text-slate-600"
                    >
                      <span>{product.label}</span>
                      <span className="font-semibold text-slate-800">
                        {product.hasValue ? product.value : '0'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </InfoSection>
        </section>

        <InfoSection className="xl:col-span-3 xl:flex xl:h-(--yard-detail-column-height) xl:flex-col">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="text-md font-bold text-slate-900">รถ Forklift</div>
            <div className="text-sm text-slate-500">{details.forkliftCountLabel}</div>
          </div>
          <div className="queue-scrollbar flex max-h-65 flex-col gap-3 overflow-y-auto pr-1 xl:max-h-none xl:flex-1 xl:min-h-0">
            {details.forkliftDrivers.length > 0 ? (
              details.forkliftDrivers.map((driverName, index) => (
                <div
                  key={`${driverName}-${index}`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-800">{driverName}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                {details.forkliftFallbackCount > 0
                  ? `มีรถ Forklift ${details.forkliftFallbackCount} คัน`
                  : 'ยังไม่มีข้อมูลรถ Forklift'}
              </div>
            )}
          </div>
        </InfoSection>

        <InfoSection className="xl:col-span-3 xl:flex xl:h-(--yard-detail-column-height) xl:flex-col">
          <div className="mb-5 text-md font-bold text-slate-900">Prediction เวลา</div>
          <div className="queue-scrollbar flex max-h-65 flex-col gap-4 overflow-y-auto pr-1 xl:max-h-none xl:flex-1 xl:min-h-0">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-slate-500">
                    <Clock3 size={20} strokeWidth={2} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-700">เวลาเริ่มโหลด</div>
                    <div className="mt-2 text-[24px] leading-none font-bold text-blue-800">
                      {details.predictionStartTime || '--:--'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-slate-500">
                    <Flag size={20} strokeWidth={2} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-700">เวลาที่คาดว่าจะโหลดเสร็จ</div>
                    <div className="mt-2 text-[24px] leading-none font-bold text-blue-800">--:--</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </InfoSection>

        <InfoSection className="xl:col-span-3 xl:flex xl:h-(--yard-detail-column-height) xl:flex-col">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="text-md font-bold text-slate-900">คิวรอเข้า</div>
            <div className="text-sm text-slate-500">{details.nextQueueCountLabel}</div>
          </div>

          {details.nextQueues.length > 0 || details.remainingUnknownQueueCount > 0 ? (
            <div className="queue-scrollbar flex max-h-65 flex-col gap-3 overflow-y-auto pr-1 xl:max-h-none xl:flex-1 xl:min-h-0">
              {details.nextQueues.map((queue, index) => (
                <div
                  key={queue.rowKey || `${queue.sequence}-${queue.licensePlate}-${index}`}
                  className="rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="truncate text-[20px] font-semibold text-slate-800">
                        {queue.licensePlate || '-'}
                      </div>
                      <div className="text-xs text-slate-400">เวลารอ {queue.waitingTime} นาที</div>
                    </div>
                    <div className="text-right text-sm text-slate-600">{queue.queueType || '-'}</div>
                  </div>
                </div>
              ))}
              {details.remainingUnknownQueueCount > 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-5 text-center text-sm text-slate-500">
                  มีคิวรอเข้าอีก {details.remainingUnknownQueueCount} คิว
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
              ยังไม่มีข้อมูลคิวรอเข้าช่อง
            </div>
          )}
        </InfoSection>
      </div>
    </BottomSheet>
  );
});
