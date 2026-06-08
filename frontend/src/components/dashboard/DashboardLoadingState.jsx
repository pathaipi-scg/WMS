import { LoaderCircle } from 'lucide-react';
import { DashboardLayout } from '../../layouts/DashboardLayout';

// หน้าจอโหลดที่จะแสดงในขณะที่กำลังรอข้อมูลจาก API สำหรับหน้าแดชบอร์ด
export function DashboardLoadingState() {
  return (
    <DashboardLayout>
      <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center px-6">
        <div className="flex w-full max-w-sm flex-col items-center rounded-[28px] border border-white/70 bg-white/90 px-10 py-12 text-center shadow-[0_24px_80px_-24px_rgba(15,23,42,0.3)] backdrop-blur">
          <div className="mb-5 flex h-18 w-18 items-center justify-center rounded-full bg-linear-to-br from-red-50 via-white to-orange-50 shadow-inner">
            <LoaderCircle className="animate-spin text-red-500" size={34} strokeWidth={2.2} />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-gray-800">กำลังโหลด</h2>
          <p className="mt-2 text-sm leading-6 text-gray-500">กรุณารอสักครู่...</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
