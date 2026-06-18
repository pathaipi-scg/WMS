export const GROUP_OPTIONS = [
  { value: 'hour', label: 'รายชั่วโมง' },
  { value: 'day',  label: 'รายวัน' },
];

export const canUseHour = (preset) => preset === 'today';

// margin ที่ใช้ร่วมกันใน LineChart (left: -20 เพื่อชดเชย YAxis label width)
export const CHART_MARGIN = { top: 8, right: 8, left: -20, bottom: 0 };

// จำนวน data points สูงสุดที่แสดง dot บน line (> นี้ซ่อน dot เพื่อให้อ่านง่าย)
export const MAX_DOTS_THRESHOLD = 31;
