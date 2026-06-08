import { normalizeQueueType, normalizeStatus } from './queueTransforms.js';
import {
  DEFAULT_LOADING_ITEM_STATUS_STYLE,
  LOADING_ITEM_STATUS_STYLES,
  QUEUE_DETAILS_EMPTY_TIME,
  QUEUE_DETAILS_PRODUCT_FIELDS,
  QUEUE_TIMELINE_STEPS,
} from '../../constants/queue.js';
import { BANGKOK_TIME_ZONE, THAI_LOCALE } from '../../constants/dateTime.js';
import { getText } from '../common/text.js';

const numberFormatter = new Intl.NumberFormat(THAI_LOCALE);

export function getLoadingItemStatusClassName(status) {
  return LOADING_ITEM_STATUS_STYLES[status] ?? DEFAULT_LOADING_ITEM_STATUS_STYLE;
}

function toNumber(value) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function formatAmount(value) {
  return numberFormatter.format(toNumber(value));
}

function formatTimelineTime(value) {
  const text = getText(value);

  if (!text) {
    return QUEUE_DETAILS_EMPTY_TIME;
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    return QUEUE_DETAILS_EMPTY_TIME;
  }

  return date.toLocaleTimeString(THAI_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: BANGKOK_TIME_ZONE,
  });
}

function hasTimelineValue(value) {
  return formatTimelineTime(value) !== QUEUE_DETAILS_EMPTY_TIME;
}

// กำหนดขั้นตอนปัจจุบันของรถในคิว
function getCurrentStep(queue = {}) {
  if (hasTimelineValue(queue.exitDate)) {
    return 5;
  }

  if (hasTimelineValue(queue.completedDate)) {
    return 4;
  }

  if (hasTimelineValue(queue.startDate)) {
    return 3;
  }

  if (hasTimelineValue(queue.callDate)) {
    return 2;
  }

  if (hasTimelineValue(queue.arrivalDate)) {
    return 1;
  }

  return 0;
}

// กำหนดความก้าวหน้าของไทม์ไลน์
function buildProducts(queue) {
  return QUEUE_DETAILS_PRODUCT_FIELDS.map(({ key, label }) => ({
    label,
    value: formatAmount(queue[key]),
    hasValue: toNumber(queue[key]) > 0,
  }));
}

// สรุปการโหลดสินค้า
function buildLoadingSummary(queue) {
  const tileTotal = toNumber(queue.cpac) + toNumber(queue.prestige) + toNumber(queue.neustile);

  return [
    {
      label: 'การโหลดกระเบื้อง',
      value: tileTotal > 0 ? formatAmount(tileTotal) : '',
      unit: 'แผ่น',
      status: getText(queue.tileStatus),
    },
    {
      label: 'การโหลด Fitting',
      value: toNumber(queue.fitting) > 0 ? formatAmount(queue.fitting) : '',
      unit: 'ชิ้น',
      status: getText(queue.fittingStatus),
    },
    {
      label: 'การโหลด Accessories',
      value: toNumber(queue.accessories) > 0 ? formatAmount(queue.accessories) : '',
      unit: 'ชิ้น',
      status: getText(queue.accStatus),
    },
  ];
}

function buildTimeline(queue, currentStep) {
  return QUEUE_TIMELINE_STEPS.map((step, index) => ({
    label: step.label,
    time: formatTimelineTime(queue[step.field]),
    isActive: currentStep >= index + 1,
  }));
}

export function buildQueueDetailsViewModel(queue = {}) {
  const currentStep = getCurrentStep(queue);

  return {
    title: getText(queue.licensePlate) || '-',
    queueType: normalizeQueueType(queue.queueType) || '-',
    status: normalizeStatus(queue.status) || '-',
    sequenceLabel: getText(queue.sequence) ? `คิวที่ ${queue.sequence}` : 'คิว -',
    waitingTimeLabel: `${toNumber(queue.waitingTime)} นาที`,
    customerName: getText(queue.customerName),
    postLocationName: getText(queue.postLocationName),
    tileStatus: getText(queue.tileStatus),
    fittingStatus: getText(queue.fittingStatus),
    accStatus: getText(queue.accStatus),
    products: buildProducts(queue),
    loadingSummary: buildLoadingSummary(queue),
    currentStep,
    timeline: buildTimeline(queue, currentStep),
  };
}
