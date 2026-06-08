import {
  ALL_QUEUE_STATUSES,
  ALL_QUEUE_TYPES,
  QUEUE_STATUS_ALIASES,
  QUEUE_TYPE_ALIASES,
} from '../constants/index.js';
import { getText } from '../../../shared/utils/text.js';

// ฟังก์ชันสำหรับสร้าง rowKey สำหรับแต่ละคิวรถ
const buildRowKey = (queue, index) =>
  [
    queue.sequence ?? 'no-seq',
    queue.licensePlate ?? 'no-plate',
    queue.queueType ?? 'no-type',
    queue.status ?? 'no-status',
    index,
  ].join('-');

// ฟังก์ชันแนบ rowKey
const attachRowKeys = (queues = []) =>
  queues.map((queue, index) => ({
    ...queue,
    rowKey: buildRowKey(queue, index),
  }));

// ฟังก์ชันเรียงคิตามเวลารอมากสุด ถ้าเท่ากันจะเรียงตามลำดับคิว
const sortQueuesByWaitingTime = (queues = []) =>
  [...queues].sort((firstQueue, secondQueue) => {
    const waitingTimeDiff = Number(secondQueue.waitingTime ?? 0) - Number(firstQueue.waitingTime ?? 0);

    if (waitingTimeDiff !== 0) {
      return waitingTimeDiff;
    }

    return Number(firstQueue.sequence ?? 0) - Number(secondQueue.sequence ?? 0);
  });

// ฟังก์ชันตรวจสอบว่าคิวรถตรงกับคำค้นหาหรือไม่
const matchesSearchTerm = (queue, searchTerm) => {
  const normalizedSearch = getText(searchTerm).toLowerCase();

  if (!normalizedSearch) {
    return true;
  }

  return [queue.licensePlate, queue.customerName, queue.postLocationName].some((value) =>
    getText(value).toLowerCase().includes(normalizedSearch),
  );
};

// ฟังก์ชันตรวจสอบว่าคิวรถตรงกับประเภทคิวที่เลือกหรือไม่
const matchesQueueType = (queue, selectedQueueType) =>
  selectedQueueType === ALL_QUEUE_TYPES || normalizeQueueType(queue.queueType) === selectedQueueType;

const matchesStatus = (queue, selectedStatus) =>
  selectedStatus === ALL_QUEUE_STATUSES || normalizeStatus(queue.status) === selectedStatus;

export function normalizeQueueType(queueType) {
  const normalizedValue = getText(queueType).toLowerCase();
  return QUEUE_TYPE_ALIASES[normalizedValue] || getText(queueType);
}

export function normalizeStatus(status) {
  const normalizedValue = getText(status).toLowerCase();
  return QUEUE_STATUS_ALIASES[normalizedValue] || getText(status);
}

// ฟังก์ชันสำหรับกรองคิวตามคำค้นหา ประเภทคิว และสถานะคิว
export function filterTruckQueues({
  queues = [],
  searchTerm = '',
  queueTypeFilter = ALL_QUEUE_TYPES,
  statusFilter = ALL_QUEUE_STATUSES,
}) {
  return sortQueuesByWaitingTime(
    queues.filter(
      (queue) =>
        matchesSearchTerm(queue, searchTerm) &&
        matchesQueueType(queue, queueTypeFilter) &&
        matchesStatus(queue, statusFilter),
    ),
  );
}

// ฟังก์ชันสำหรับแปลง snake_case จาก API เป็น camelCase
const normalizeQueueFields = (queue) => ({
  ...queue,
  customerName: queue.customerName ?? queue.customer_name ?? '',
  postLocationName: queue.postLocationName ?? queue.post_location_name ?? '',
  predictedFinishTime: queue.predictedFinishTime ?? null,
  predictedTotalTimeMin: queue.predictedTotalTimeMin ?? null,
});

// ฟังก์ชันสำหรับเตรียมข้อมูลคิวรถ และจัดเรียงตามเวลารอ
export function prepareTruckQueues(queues = []) {
  return sortQueuesByWaitingTime(attachRowKeys(queues.map(normalizeQueueFields)));
}
