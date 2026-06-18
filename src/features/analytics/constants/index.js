// WebSocket realtime สำหรับมุมมอง "วันนี้" ของหน้า Analytics
export const ANALYTICS_SOCKET_PATH = '/ws/analytics/stream/';
export const ANALYTICS_SNAPSHOT_PATH = '/analytics/snapshot/';
export const ANALYTICS_SNAPSHOT_EVENT = 'analytics.snapshot';

export const PRESET_OPTIONS = [
  { value: 'today', label: 'วันนี้' },
  { value: '7d',    label: '7 วัน' },
  { value: '30d',   label: '30 วัน' },
  { value: '3m',    label: '3 เดือน' },
  { value: '6m',    label: '6 เดือน' },
  { value: '1y',    label: '1 ปี' },
];
