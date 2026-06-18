export const ALL_QUEUE_TYPES = 'all';
export const ALL_QUEUE_STATUSES = 'all';

export const QUEUE_TYPES = {
  advance: 'ล่วงหน้า',
  smartQ: 'SmartQ',
  walkIn: 'Walk in',
};

export const QUEUE_STATUSES = {
  loading: 'กำลังโหลด',
  waiting: 'รอคิว',
};

export const QUEUE_TYPE_OPTIONS = [
  { value: ALL_QUEUE_TYPES, label: 'คิวทั้งหมด' },
  { value: QUEUE_TYPES.advance, label: QUEUE_TYPES.advance },
  { value: QUEUE_TYPES.smartQ, label: QUEUE_TYPES.smartQ },
  { value: QUEUE_TYPES.walkIn, label: QUEUE_TYPES.walkIn },
];

export const QUEUE_STATUS_OPTIONS = [
  { value: ALL_QUEUE_STATUSES, label: 'สถานะทั้งหมด' },
  { value: QUEUE_STATUSES.loading, label: QUEUE_STATUSES.loading },
  { value: QUEUE_STATUSES.waiting, label: QUEUE_STATUSES.waiting },
];

export const QUEUE_TYPE_ALIASES = {
  smartq: QUEUE_TYPES.smartQ,
  'walk in': QUEUE_TYPES.walkIn,
  'walk-in': QUEUE_TYPES.walkIn,
  ล่วงหน้า: QUEUE_TYPES.advance,
};

export const QUEUE_STATUS_ALIASES = {
  loading: QUEUE_STATUSES.loading,
  กำลังโหลด: QUEUE_STATUSES.loading,
  waiting: QUEUE_STATUSES.waiting,
  รอคิว: QUEUE_STATUSES.waiting,
};

export const QUEUE_DETAILS_EMPTY_TIME = '-- : --';

export const QUEUE_DETAILS_PRODUCT_FIELDS = [
  { key: 'cpac', label: 'CPAC' },
  { key: 'prestige', label: 'PRESTIGE' },
  { key: 'neustile', label: 'NEUSTILE' },
  { key: 'fitting', label: 'FITTING' },
  { key: 'accessories', label: 'ACCESSORIES' },
];

export const QUEUE_TIMELINE_STEPS = [
  { label: 'เข้าโรงงาน', field: 'arrivalDate' },
  { label: 'เรียกคิว', field: 'callDate' },
  { label: 'เริ่มโหลด', field: 'startDate' },
  { label: 'โหลดเสร็จ', field: 'completedDate' },
  { label: 'ปิดงาน', field: 'checkerClose' },
  { label: 'ออกโรงงาน', field: 'exitDate' },
];

export const LOADING_ITEM_STATUS_STYLES = {
  'ไม่มีรับ': 'bg-slate-100 text-slate-600',
  'ยังไม่เริ่ม': 'bg-red-100 text-red-700',
  'เริ่มจัด': 'bg-amber-100 text-amber-700',
  'เสร็จแล้ว': 'bg-emerald-100 text-emerald-700',
};

export const DEFAULT_LOADING_ITEM_STATUS_STYLE = 'bg-slate-100 text-slate-600';
