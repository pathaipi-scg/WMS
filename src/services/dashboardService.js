import { DASHBOARD_SNAPSHOT_PATH, DASHBOARD_SOCKET_PATH } from '../features/dashboard/constants';
import { apiClient } from './apiClient';
import { buildSocketUrl } from './websocket';

// ฟังก์ชันสำหรับดึงข้อมูล snapshot ของแดชบอร์ดจาก API
export async function getDashboardSnapshot() {
  const response = await apiClient.get(DASHBOARD_SNAPSHOT_PATH);
  return response.data;
}

// ฟังก์ชันสำหรับสร้าง URL ของ WebSocket สำหรับเชื่อมต่อกับสตรีมข้อมูลของแดชบอร์ด
export function getDashboardSocketUrl() {
  return buildSocketUrl(DASHBOARD_SOCKET_PATH);
}
