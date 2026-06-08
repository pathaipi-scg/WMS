import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildQueueDetailsViewModel,
  getLoadingItemStatusClassName,
} from '../src/utils/queue/queueDetailsModel.js';
import {
  DEFAULT_LOADING_ITEM_STATUS_STYLE,
  LOADING_ITEM_STATUS_STYLES,
  QUEUE_DETAILS_EMPTY_TIME,
  QUEUE_TIMELINE_STEPS,
  QUEUE_TYPES,
  QUEUE_STATUSES,
} from '../src/constants/queue.js';

test('getLoadingItemStatusClassName falls back to the default style for unknown statuses', () => {
  assert.equal(getLoadingItemStatusClassName('สถานะที่ไม่มีในระบบ'), DEFAULT_LOADING_ITEM_STATUS_STYLE);
  assert.equal(getLoadingItemStatusClassName('เสร็จแล้ว'), LOADING_ITEM_STATUS_STYLES['เสร็จแล้ว']);
});

test('buildQueueDetailsViewModel maps queue details, loading summary, and timeline state', () => {
  const details = buildQueueDetailsViewModel({
    licensePlate: '71-6625',
    queueType: 'smartq',
    status: 'loading',
    sequence: 12,
    waitingTime: '35',
    customerName: 'ลูกค้า A',
    postLocationName: 'ลานจ่าย 1 ช่อง 1',
    cpac: 1000,
    prestige: 25,
    neustile: 0,
    fitting: 3,
    accessories: 0,
    tileStatus: 'เริ่มจัด',
    fittingStatus: 'เสร็จแล้ว',
    accStatus: 'ไม่มีรับ',
    arrivalDate: '2026-04-22T10:45:00+07:00',
    callDate: '2026-04-22T10:55:00+07:00',
    startDate: '2026-04-22T11:05:00+07:00',
  });

  assert.equal(details.title, '71-6625');
  assert.equal(details.queueType, QUEUE_TYPES.smartQ);
  assert.equal(details.status, QUEUE_STATUSES.loading);
  assert.equal(details.sequenceLabel, 'คิวที่ 12');
  assert.equal(details.waitingTimeLabel, '35 นาที');
  assert.equal(details.currentStep, 3);
  assert.equal(details.timeline.length, QUEUE_TIMELINE_STEPS.length);
  assert.deepEqual(
    details.timeline.map((item) => item.isActive),
    [true, true, true, false, false],
  );
  assert.equal(details.timeline[0].time, '10:45');
  assert.equal(details.timeline[3].time, QUEUE_DETAILS_EMPTY_TIME);
  assert.equal(details.products[0].value, '1,000');
  assert.equal(details.products[0].hasValue, true);
  assert.equal(details.loadingSummary[0].value, '1,025');
  assert.equal(details.loadingSummary[1].value, '3');
  assert.equal(details.loadingSummary[2].value, '');
});
