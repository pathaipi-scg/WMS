import { DashboardLayout } from '../layouts/DashboardLayout';
import { SummaryCard, useDashboardData, SUMMARY_CARD_ITEMS, DashboardRealtimeProvider } from '../features/dashboard';
import { PageLoadingState } from '../shared/components/feedback/PageLoadingState';
import { ConnectionStatusBanner } from '../shared/components/feedback/ConnectionStatusBanner';
import { QueueTable } from '../features/queue';
import { YardPanel } from '../features/yard';
// หน้าหลักของแดชบอร์ดที่แสดงภาพรวมของข้อมูลต่างๆ เช่น สรุปสถานะรถในคิว ตารางคิวรถ และข้อมูลลานจ่าย โดยใช้ข้อมูลจาก useDashboardData ซึ่งดึงมาจาก WebSocket แบบเรียลไทม์

export function DashboardPage() {
  // Provider เปิด WebSocket เส้นเดียว แล้วแชร์ให้ useDashboardData + การแจ้งเตือนใน Header
  return (
    <DashboardRealtimeProvider>
      <DashboardPageContent />
    </DashboardRealtimeProvider>
  );
}

function DashboardPageContent() {
  const {
    summaryData,
    truckQueues,
    yardZones,
    yardStats,
    plantName,
    isLoading,
    connectionStatus,
  } = useDashboardData();

  // หากข้อมูลยังอยู่ในระหว่างการโหลด จะแสดงหน้าโหลดข้อมูล
  if (isLoading) {
    return <PageLoadingState />;
  }

  return (
    <DashboardLayout plantName={plantName} truckQueues={truckQueues}>
      <ConnectionStatusBanner status={connectionStatus} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12 xl:items-stretch h-full">
        <div className="flex flex-col gap-5 xl:col-span-9 h-full min-h-0">
          <section className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7 shrink-0">
            {SUMMARY_CARD_ITEMS.map(({ id, icon: Icon, getValue, ...card }) => (
              <SummaryCard
                key={id}
                {...card}
                value={getValue({ summaryData, yardStats })}
                icon={<Icon size={18} strokeWidth={2.5} />}
              />
            ))}
          </section>

          <section className="h-125 xl:h-auto xl:flex-1 min-h-0">
            <QueueTable queues={truckQueues} />
          </section>
        </div>

        <div className="flex flex-col gap-6 xl:col-span-3 h-125 xl:h-full min-h-0">
          <section className="flex-1 min-h-0 h-full">
            <YardPanel zones={yardZones} />
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
