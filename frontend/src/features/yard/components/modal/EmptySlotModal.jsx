import { CheckCircle2, X } from 'lucide-react';
import { BottomSheet } from '../../../../shared/components/BottomSheet';

// Modal แสดงสถานะช่องจ่ายว่าง
export function EmptySlotModal({ isOpen, onClose }) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      {({ handleClose }) => (
        <div className="relative">
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-0 top-0 z-10 cursor-pointer rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="ปิดรายละเอียดช่องลานจ่าย"
          >
            <X size={24} />
          </button>
          <div className="flex min-h-90 flex-col items-center justify-center gap-6 px-6 py-10 text-center">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
              <CheckCircle2 size={54} strokeWidth={2.25} />
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-slate-900">ลานจ่ายนี้ว่างพร้อมใช้งาน</h2>
              <p className="mx-auto text-lg text-slate-500">
                ไม่มีรถกำลังโหลดสินค้าในช่องนี้ สามารถเรียกคิวถัดไปเข้ารับบริการได้ทันที
              </p>
            </div>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
