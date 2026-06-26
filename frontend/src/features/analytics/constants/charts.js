export const GROUP_OPTIONS = [
  { value: 'hour', label: 'รายชั่วโมง' },
  { value: 'day',  label: 'รายวัน' },
];

export const canUseHour = (preset) => preset === 'today';

// margin ที่ใช้ร่วมกันใน LineChart (left: -20 เพื่อชดเชย YAxis label width)
export const CHART_MARGIN = { top: 8, right: 8, left: -20, bottom: 0 };

// จำนวน data points สูงสุดที่แสดง dot บน line (> นี้ซ่อน dot เพื่อให้อ่านง่าย)
export const MAX_DOTS_THRESHOLD = 31;

// ประเภทรถ + สีประจำเส้น/แท่ง (sync กับ TRUCK_TYPE_CASE ฝั่ง backend)
// key ตรงกับ field ที่ backend ส่งมา ('4 ล้อ', '6 ล้อ', ...)
export const TRUCK_TYPE_SERIES = [
  { key: '4 ล้อ',    label: '4 ล้อ',    color: '#3b82f6' },
  { key: '6 ล้อ',    label: '6 ล้อ',    color: '#10b981' },
  { key: '10 ล้อ',   label: '10 ล้อ',   color: '#f59e0b' },
  { key: 'เทรเลอร์', label: 'เทรเลอร์', color: '#ef4444' },
  { key: 'อื่นๆ',    label: 'อื่นๆ',    color: '#9ca3af' },
];
