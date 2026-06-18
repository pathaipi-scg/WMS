import { memo } from 'react';
import { Header } from './Header';
// Layout หลักของแดชบอร์ดที่ประกอบด้วย Header และพื้นที่แสดงเนื้อหาต่างๆ ของแดชบอร์ด 

export const DashboardLayout = memo(function DashboardLayout({
  children,
  plantName,
  truckQueues = [],
  showNotifications = true,
}) {
  return (
    <div className="h-screen flex flex-col bg-[#F8F9FA] font-sans text-gray-900">
      <Header
        plantName={plantName}
        truckQueues={truckQueues}
        showNotifications={showNotifications}
      />
      <main className="flex-1 min-h-0 p-6">{children}</main>
    </div>
  );
});
