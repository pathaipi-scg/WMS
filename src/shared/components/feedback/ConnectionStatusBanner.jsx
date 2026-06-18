import { memo } from 'react';
import { WifiOff } from 'lucide-react';

// ข้อความตามสถานะการเชื่อมต่อ WebSocket ของแดชบอร์ด
const STATUS_LABEL = {
  connecting: 'กำลังเชื่อมต่อ...',
  reconnecting: 'ขาดการเชื่อมต่อ กำลังเชื่อมต่อใหม่...',
};

/**
 * แถบแจ้งเตือนสถานะการเชื่อมต่อเรียลไทม์ (WebSocket).
 * แสดงเมื่อ socket ยังไม่ open เท่านั้น (connecting/reconnecting) เพื่อบอกผู้ใช้ว่าข้อมูลอาจไม่อัปเดต.
 * ใช้ position: fixed จึงไม่กระทบ layout เดิม และประกาศผ่าน aria-live ให้ screen reader รับรู้.
 * @param {{ status: 'open'|'connecting'|'reconnecting' }} props
 */
export const ConnectionStatusBanner = memo(function ConnectionStatusBanner({ status }) {
  if (status === 'open' || !status) {
    return null;
  }

  const label = STATUS_LABEL[status] ?? STATUS_LABEL.reconnecting;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 shadow-md"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
      </span>
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      {label}
    </div>
  );
});
