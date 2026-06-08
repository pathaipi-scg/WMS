import { WAITING_TIME_LIMITS } from '../constants';

function normalizeWaitingTime(value) {
  return Math.max(WAITING_TIME_LIMITS.min, Number(value) || 0);
}
// ฟังก์ชันสำหรับแปลงค่าเวลารอคิวให้เป็นจำนวนเต็มของนาที 
export function getWaitingTimeMinutes(value) {
  return normalizeWaitingTime(value);
}

// ฟังก์ชันสำหรับ ProgressBar ของเวลารอคิว 
export function getWaitingTimeProgressColor(value) {
  const waitingTime = normalizeWaitingTime(value);

  if (waitingTime >= WAITING_TIME_LIMITS.danger) return 'bg-red-600';
  if (waitingTime >= WAITING_TIME_LIMITS.warning) return 'bg-yellow-400';
  return 'bg-green-500';
}

// ฟังก์ชันเเสดงสีข้อความเวลารอคิว 
export function getWaitingTimeTextColor(value) {
  const waitingTime = normalizeWaitingTime(value);

  if (waitingTime >= WAITING_TIME_LIMITS.danger) return 'text-red-600';
  if (waitingTime >= WAITING_TIME_LIMITS.warning) return 'text-yellow-500';
  return 'text-green-500';
}

// ฟังก์ชันคำนวณความกว้างของ ProgressBar ของเวลารอคิว 
export function getWaitingTimeProgressWidth(value) {
  const waitingTime = normalizeWaitingTime(value);
  return `${Math.min((waitingTime / WAITING_TIME_LIMITS.maxProgress) * 100, 100)}%`;
}
