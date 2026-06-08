import { WS_ORIGIN } from '../config/env';
import {
  DASHBOARD_SNAPSHOT_PATH,
  DASHBOARD_SOCKET_PATH,
} from '../features/dashboard/constants';
import { apiClient } from './apiClient';

// ฟังก์ชันสำหรับแปลง URL ของ WebSocket ให้เหมาะสมกับโปรโตคอลที่ใช้ (ws:// หรือ wss://) ตามที่กำหนดใน WS_ORIGIN
function getWebSocketOrigin() {
  if (WS_ORIGIN.startsWith('https://')) {
    return WS_ORIGIN.replace('https://', 'wss://');
  }

  if (WS_ORIGIN.startsWith('http://')) {
    return WS_ORIGIN.replace('http://', 'ws://');
  }

  return WS_ORIGIN;
}

// ฟังก์ชันสำหรับดึงข้อมูล snapshot ของแดชบอร์ดจาก API
export async function getDashboardSnapshot() {
  const response = await apiClient.get(DASHBOARD_SNAPSHOT_PATH);
  return response.data;
}

// ฟังก์ชันสำหรับสร้าง URL ของ WebSocket สำหรับเชื่อมต่อกับสตรีมข้อมูลของแดชบอร์ด
export function getDashboardSocketUrl() {
  return `${getWebSocketOrigin()}${DASHBOARD_SOCKET_PATH}`;
}
