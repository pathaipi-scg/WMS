import { DashboardLayout } from '../layouts/DashboardLayout';
import { SummaryCard, useDashboardData, SUMMARY_CARD_ITEMS } from '../features/dashboard';
import { PageLoadingState } from '../shared/components/PageLoadingState';
import { LastUpdatedStatus } from '../shared/components/LastUpdatedStatus';
import { QueueTable } from '../features/queue';
import { YardPanel } from '../features/yard';
// หน้าหลักของแดชบอร์ดที่แสดงภาพรวมของข้อมูลต่างๆ เช่น สรุปสถานะรถในคิว ตารางคิวรถ และข้อมูลลานจ่าย โดยใช้ข้อมูลจาก useDashboardData ซึ่งดึงมาจาก WebSocket แบบเรียลไทม์

export function DashboardPage({ onNavigate }) {
  const {
    summaryData,
    truckQueues,
    yardZones,
    yardStats,
    plantName,
    capturedAt,
    isLoading,
    error,
  } = useDashboardData();

  // หากข้อมูลยังอยู่ในระหว่างการโหลด จะแสดงหน้าโหลดข้อมูล
  if (isLoading) {
    return <PageLoadingState activePage="dashboard" onNavigate={onNavigate} />;
  }

  return (
    <DashboardLayout plantName={plantName} truckQueues={truckQueues} activePage="dashboard" onNavigate={onNavigate} capturedAt={capturedAt} error={error}>
      {/* <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">ภาพรวม</h2>
        <LastUpdatedStatus capturedAt={capturedAt} error={error} />
      </div> */}

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

          <section className="h-[500px] xl:h-auto xl:flex-1 min-h-0">
            <QueueTable queues={truckQueues} />
          </section>
        </div>

        <div className="flex flex-col gap-6 xl:col-span-3 h-[500px] xl:h-full min-h-0">
          <section className="flex-1 min-h-0 h-full">
            <YardPanel zones={yardZones} />
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
