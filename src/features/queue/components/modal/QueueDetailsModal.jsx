import { memo, useMemo } from 'react';
import { Check, CircleUserRound, ClipboardCheck, Clock, MapPin, Megaphone, Package, Package2, SquareArrowRightExit, Truck } from 'lucide-react';
import { buildQueueDetailsViewModel, getLoadingItemStatusClassName } from '../../utils/queueDetailsModel';
import {
  getStepClassName,
  getStepLabelClassName,
  getTimelineProgressWidth,
} from '../../utils/timelineStyles';
import { QueueStatusBadge } from '../QueueStatusBadge';
import { BottomSheet } from '../../../../shared/components/modal/BottomSheet';
import { ModalIconHeader } from '../../../../shared/components/modal/ModalIconHeader';
import { InfoSection } from '../../../../shared/components/modal/InfoSection';

const TIMELINE_ICONS = [Clock, Megaphone, Package, Check, ClipboardCheck, SquareArrowRightExit];

export const QueueDetailsModal = memo(function QueueDetailsModal({ queue, onClose }) {
  const details = useMemo(() => buildQueueDetailsViewModel(queue), [queue]);

  return (
    <BottomSheet isOpen={!!queue} onClose={onClose}>
      <ModalIconHeader
        align="center"
        icon={<Truck size={24} strokeWidth={2} />}
        left={
          <div className="flex flex-col gap-2">
            <div className="text-[25px] font-bold leading-tight text-slate-900">
              รายละเอียดรถ: {details.title}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-slate-600">
              <span>ประเภทคิว: {details.queueType}</span>
              <span>เวลารอ: {details.waitingTimeLabel}</span>
            </div>
          </div>
        }
        right={
          <div className="flex flex-col items-end gap-2">
            <QueueStatusBadge status={details.status} size="lg" />
            <span className="px-4 py-1.5 text-sm font-semibold text-slate-700">
              {details.sequenceLabel}
            </span>
          </div>
        }
      />

      <div className="mt-4 grid grid-cols-1 gap-5 xl:grid-cols-12">
        <InfoSection className="xl:col-span-4">
          <div className="space-y-7">
            <div className="flex gap-4">
              <div className="mt-0.5 text-slate-700">
                <CircleUserRound size={24} strokeWidth={2} />
              </div>
              <div className="w-full">
                <div className="text-md font-bold text-slate-900">ลูกค้า</div>
                <div className="mt-2 text-sm text-slate-600">{details.customerName || '-'}</div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="mt-0.5 text-slate-700">
                <Package2 size={24} strokeWidth={2} />
              </div>
              <div className="w-full">
                <div className="text-md font-bold text-slate-900">รายละเอียดสินค้า</div>
                <div className="mt-2">
                  <div className="grid grid-cols-1 gap-x-30 gap-y-2 sm:grid-cols-2">
                    {details.products.map((product) => (
                      <div
                        key={product.label}
                        className="flex items-center justify-between gap-4 text-sm text-slate-600"
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
            </div>

            <div className="flex gap-4">
              <div className="mt-0.5 text-slate-700">
                <MapPin size={24} strokeWidth={2} />
              </div>
              <div className="w-full">
                <div className="text-md font-bold text-slate-900">สถานที่โหลด</div>
                <div className="mt-2 text-sm text-slate-600">{details.postLocationName || '-'}</div>
              </div>
            </div>
          </div>
        </InfoSection>

        <InfoSection className="xl:col-span-3">
          <div className="mb-5 text-md font-bold text-slate-900">สถานะการโหลดสินค้า</div>
          <div className="mb-4 flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
              <Package size={16} />
              <span>Pallet ที่โหลดแล้ว</span>
            </div>
            <span className="text-sm font-bold text-blue-900">
              {details.totalPalletCount > 0
                ? `${details.loadedPalletCount} / ${details.totalPalletCount}`
                : '-'}
            </span>
          </div>
          <div className="flex min-h-55 w-full justify-between">
            <div className="flex w-full flex-col justify-end gap-4 space-y-5">
              {details.loadingSummary.map((item) => (
                <div key={item.label}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-slate-800">{item.label}</div>
                      <div className="text-sm text-slate-500">
                        {item.value ? `${item.value} ${item.unit}` : '0'}
                      </div>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getLoadingItemStatusClassName(item.status)}`}
                    >
                      {item.status || '-'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </InfoSection>

        <InfoSection className="xl:col-span-5">
          <div className="mb-5 flex items-center gap-2 text-md font-bold text-slate-900">
            <span>TIMELINE การดำเนินงาน</span>
          </div>
          <div className="flex min-h-55 w-full items-center justify-center">
            <div className="flex h-full w-full items-center">
              <div className="relative w-full">
                <div className="absolute left-6 right-6 top-5 z-0 h-1 bg-gray-200" />
                <div
                  className="absolute left-6 top-5 z-0 h-1 bg-blue-600 transition-all duration-1000"
                  style={{ width: getTimelineProgressWidth(details.currentStep, details.timeline.length) }}
                />
                <div className="relative z-10 flex w-full justify-between gap-3">
                  {details.timeline.map((item, index) => {
                    const Icon = TIMELINE_ICONS[index];
                    const stepIndex = index + 1;

                    return (
                      <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full border-4 border-white shadow-md transition-colors ${getStepClassName(stepIndex, details.currentStep)}`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="mt-2 text-center">
                          <div className={`text-sm font-semibold ${getStepLabelClassName(stepIndex, details.currentStep)}`}>
                            {item.label}
                          </div>
                          <div className="mt-3 text-sm text-gray-500">{item.time}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </InfoSection>
      </div>
    </BottomSheet>
  );
});
