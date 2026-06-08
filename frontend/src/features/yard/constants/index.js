export const YARD_TYPES = {
  equipment: 'equipment',
  yard: 'yard',
};

export const YARD_STATUSES = {
  available: 'available',
  loading: 'loading',
  completed: 'completed',
};

export const YARD_STATUS_LABELS = {
  available: 'ว่าง',
  loading: 'กำลังโหลด',
};

export const YARD_EMPTY_STATS = {
  totalBays: 0,
  availableBays: 0,
  loadingBays: 0,
};

export const YARD_FILTERS = {
  all: 'all',
  available: YARD_STATUSES.available,
  loading: YARD_STATUSES.loading,
};

export const YARD_KEYWORDS = {
  equipment: 'อุปกรณ์',
  yard: 'ลานจ่าย',
  legacyYard: 'ลายจ่าย',
  slot: 'ช่องจ่าย',
  shortSlot: 'ช่อง',
};
