// WebSocket realtime สำหรับมุมมอง "วันนี้" ของหน้า Predictions
export const PREDICTIONS_SOCKET_PATH = '/ws/predictions/stream/';
export const PREDICTIONS_SNAPSHOT_PATH = '/predictions/snapshot/';
export const PREDICTIONS_SNAPSHOT_EVENT = 'predictions.snapshot';

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export const STATUS_OPTIONS = [
  { value: 'all', label: 'ทุกสถานะ' },
  { value: 'completed', label: 'เสร็จแล้ว' },
  { value: 'in_progress', label: 'กำลังดำเนินการ' },
];
