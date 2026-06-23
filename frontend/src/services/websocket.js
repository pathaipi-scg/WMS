import { WS_ORIGIN } from '../config/env';
import { getToken, getPlantCode } from './session';

// แปลง origin ให้เป็นโปรโตคอล WebSocket (ws:// หรือ wss://) ตาม WS_ORIGIN
function getWebSocketOrigin() {
  if (WS_ORIGIN.startsWith('https://')) {
    return WS_ORIGIN.replace('https://', 'wss://');
  }

  if (WS_ORIGIN.startsWith('http://')) {
    return WS_ORIGIN.replace('http://', 'ws://');
  }

  return WS_ORIGIN;
}

// สร้าง URL ของ WebSocket จาก path เช่น '/ws/dashboard/stream/'
// แนบ plant_code + token (ถ้ามี) เพื่อให้ backend บังคับสิทธิ์โรงงานได้
export function buildSocketUrl(path) {
  const baseUrl = `${getWebSocketOrigin()}${path}`;

  const params = new URLSearchParams();
  const plantCode = getPlantCode();
  const token = getToken();
  if (plantCode) params.set('plant_code', plantCode);
  if (token) params.set('token', token);

  const query = params.toString();
  return query ? `${baseUrl}?${query}` : baseUrl;
}
