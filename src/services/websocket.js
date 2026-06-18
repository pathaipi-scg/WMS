import { WS_ORIGIN } from '../config/env';

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
export function buildSocketUrl(path) {
  return `${getWebSocketOrigin()}${path}`;
}
