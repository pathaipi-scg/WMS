import { useMemo } from 'react';
import { createDashboardState } from '../utils/createDashboardState';
import { useDashboardRealtime } from '../realtime/DashboardRealtimeProvider';
// Hook สำหรับจัดการข้อมูลแดชบอร์ด โดยใช้ข้อมูลจาก useDashboardRealtime และแปลงเป็นรูปแบบที่เหมาะสมสำหรับการแสดงผลในคอมโพเนนต์ต่างๆ ของแดชบอร์ด

const EMPTY_DASHBOARD_STATE = createDashboardState();

export function useDashboardData() {
  const { snapshot, isLoading, error, connectionStatus } = useDashboardRealtime();

  const dashboardState = useMemo(
    () => (snapshot ? createDashboardState(snapshot) : EMPTY_DASHBOARD_STATE),
    [snapshot],
  );

  return {
    ...dashboardState,
    isLoading,
    error,
    connectionStatus,
  };
}
