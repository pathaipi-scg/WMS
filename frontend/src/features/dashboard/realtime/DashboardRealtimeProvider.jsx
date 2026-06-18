import { createRealtimeContext } from '../../../shared/hooks/createRealtimeContext';
import { getDashboardSnapshot, getDashboardSocketUrl } from '../../../services/dashboardService';
import { DASHBOARD_LOAD_ERROR, DASHBOARD_SNAPSHOT_EVENT } from '../constants';

// Provider เปิด WebSocket ของแดชบอร์ดเส้นเดียว แล้วแชร์ให้ทุกตัวที่ใช้
// (useDashboardData + useBackendNotifications) กันการ fetch/connect ซ้ำ
const { Provider, useRealtimeContext } = createRealtimeContext(() => ({
  socketUrl: getDashboardSocketUrl(),
  event: DASHBOARD_SNAPSHOT_EVENT,
  fetchInitial: getDashboardSnapshot,
  loadErrorMessage: DASHBOARD_LOAD_ERROR,
}));

export const DashboardRealtimeProvider = Provider;
export const useDashboardRealtime = useRealtimeContext;
