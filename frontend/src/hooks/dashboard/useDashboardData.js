import { useMemo } from 'react';
import { createDashboardState } from '../../utils/dashboard/createDashboardState';
import { useDashboardRealtime } from './useDashboardRealtime';
// Hook สำหรับจัดการข้อมูลแดชบอร์ด โดยใช้ข้อมูลจาก useDashboardRealtime และแปลงเป็นรูปแบบที่เหมาะสมสำหรับการแสดงผลในคอมโพเนนต์ต่างๆ ของแดชบอร์ด

const EMPTY_DASHBOARD_STATE = createDashboardState();

export function useDashboardData() {
  const { snapshot, isLoading, error } = useDashboardRealtime();

  const dashboardState = useMemo(
    () => (snapshot ? createDashboardState(snapshot) : EMPTY_DASHBOARD_STATE),
    [snapshot],
  );

  return {
    ...dashboardState,
    isLoading,
    error,
  };
}
