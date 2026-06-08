export const NOTIFICATION_TYPES = {
  pendingCall: 'pending-call',
  waitingLoad: 'waiting-load',
  waitingClose: 'waiting-close',
};

export const NOTIFICATION_SEVERITIES = {
  warning: 'warning',
  orange: 'orange',
  danger: 'danger',
};

function normalizeRuleValue(value) {
  return String(value ?? '').trim().toUpperCase();
}

export const TRUCK_QUEUE_NOTIFICATION_RULES = [
  {
    type: NOTIFICATION_TYPES.pendingCall,
    severity: NOTIFICATION_SEVERITIES.warning,
    getTitle: (queue) => `รถ ${queue.licensePlate || '-'} รอเรียก`,
    startFields: ['operatorCarConfirm', 'arrivalDate'],
    completeFields: ['carConfirm', 'callDate'],
    thresholdMinutes: 5,
    getDescription: (queue, elapsedMinutes) =>
      `ยื่นตั๋วเเล้ว เเต่ยังไม่ถูกเรียก ${elapsedMinutes} นาที`,
  },
  {
    type: NOTIFICATION_TYPES.waitingLoad,
    severity: NOTIFICATION_SEVERITIES.orange,
    getTitle: (queue) => `รถ ${queue.licensePlate || '-'} รอโหลด`,
    startFields: ['carConfirm', 'callDate'],
    completeFields: ['firstPallet', 'startDate'],
    thresholdMinutes: 15,
    getDescription: (queue, elapsedMinutes) =>
      `ถูกเรียกแล้ว แต่ยังไม่เริ่มโหลด ${elapsedMinutes} นาที`,
  },
  {
    type: NOTIFICATION_TYPES.waitingClose,
    severity: NOTIFICATION_SEVERITIES.danger,
    getTitle: (queue) => `รถ ${queue.licensePlate || '-'} รอปิดงาน`,
    startFields: ['lastPostPallet', 'completedDate'],
    completeFields: ['postingTime', 'exitDate'],
    matches: (queue) =>
      Boolean(queue.completedDate) ||
      normalizeRuleValue(queue.packListStatus) === 'CHECKERCOMPLETED',
    thresholdMinutes: 10,
    getDescription: (queue, elapsedMinutes) =>
      `โหลดเสร็จแล้ว แต่ยังไม่ปิดงาน ${elapsedMinutes} นาที`,
  },
];
