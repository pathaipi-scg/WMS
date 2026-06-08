import assert from 'node:assert/strict';
import test from 'node:test';
import {
  NOTIFICATION_SEVERITIES,
  NOTIFICATION_TYPES,
} from '../src/features/notifications/constants/notificationRules.js';
import {
  createTruckQueueNotifications,
  parseNotificationDate,
} from '../src/features/notifications/utils/createTruckQueueNotifications.js';

const NOW = '2026-04-23T10:20:00+07:00';

function createQueue(overrides = {}) {
  return {
    rowKey: 'queue-1',
    sequence: 1,
    licensePlate: '71-3547',
    postLocationName: 'ลานจ่าย 1 ช่อง 2',
    operatorCarConfirm: null,
    carConfirm: null,
    firstPallet: null,
    lastPostPallet: null,
    packListStatus: null,
    postingTime: null,
    ...overrides,
  };
}

test('parseNotificationDate accepts SQL datetime strings with a space separator', () => {
  const date = parseNotificationDate('2026-04-23 10:15:00+07:00');

  assert.equal(date?.toISOString(), '2026-04-23T03:15:00.000Z');
});

test('creates a pending call notification when operator car confirm exceeds 5 minutes without car confirm', () => {
  const notifications = createTruckQueueNotifications(
    [
      createQueue({
        operatorCarConfirm: '2026-04-23T10:14:00+07:00',
      }),
    ],
    NOW,
  );

  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].type, NOTIFICATION_TYPES.pendingCall);
  assert.equal(notifications[0].severity, NOTIFICATION_SEVERITIES.warning);
  assert.equal(notifications[0].title, 'รถ 71-3547 รอเรียก');
  assert.equal(notifications[0].elapsedMinutes, 6);
});

test('does not create a pending call notification before the 5 minute threshold or after car confirm', () => {
  const notifications = createTruckQueueNotifications(
    [
      createQueue({
        rowKey: 'before-threshold',
        operatorCarConfirm: '2026-04-23T10:16:00+07:00',
      }),
      createQueue({
        rowKey: 'already-confirmed',
        operatorCarConfirm: '2026-04-23T10:00:00+07:00',
        carConfirm: '2026-04-23T10:03:00+07:00',
        firstPallet: '2026-04-23T10:10:00+07:00',
      }),
    ],
    NOW,
  );

  assert.deepEqual(notifications, []);
});

test('uses arrival date as a fallback for pending call notifications', () => {
  const notifications = createTruckQueueNotifications(
    [
      createQueue({
        arrivalDate: '2026-04-23T10:14:00+07:00',
      }),
    ],
    NOW,
  );

  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].type, NOTIFICATION_TYPES.pendingCall);
});

test('creates a waiting load notification when car confirm exceeds 15 minutes without first pallet', () => {
  const notifications = createTruckQueueNotifications(
    [
      createQueue({
        carConfirm: '2026-04-23T10:04:00+07:00',
      }),
    ],
    NOW,
  );

  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].type, NOTIFICATION_TYPES.waitingLoad);
  assert.equal(notifications[0].severity, NOTIFICATION_SEVERITIES.orange);
  assert.equal(notifications[0].elapsedMinutes, 16);
});

test('uses call date as a fallback for waiting load notifications', () => {
  const notifications = createTruckQueueNotifications(
    [
      createQueue({
        callDate: '2026-04-23T10:04:00+07:00',
      }),
    ],
    NOW,
  );

  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].type, NOTIFICATION_TYPES.waitingLoad);
});

test('creates a waiting close notification when last post pallet exceeds 10 minutes without posting time', () => {
  const notifications = createTruckQueueNotifications(
    [
      createQueue({
        lastPostPallet: '2026-04-23T10:09:00+07:00',
        packListStatus: 'CHECKERCOMPLETED',
      }),
    ],
    NOW,
  );

  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].type, NOTIFICATION_TYPES.waitingClose);
  assert.equal(notifications[0].severity, NOTIFICATION_SEVERITIES.danger);
  assert.equal(notifications[0].elapsedMinutes, 11);
});

test('uses completed date as a fallback for waiting close notifications', () => {
  const notifications = createTruckQueueNotifications(
    [
      createQueue({
        completedDate: '2026-04-23T10:09:00+07:00',
      }),
    ],
    NOW,
  );

  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].type, NOTIFICATION_TYPES.waitingClose);
});

test('does not create a waiting close notification when pack list status is not checker completed', () => {
  const notifications = createTruckQueueNotifications(
    [
      createQueue({
        lastPostPallet: '2026-04-23T10:00:00+07:00',
        packListStatus: 'WAITCHECKER',
      }),
    ],
    NOW,
  );

  assert.deepEqual(notifications, []);
});

test('sorts notifications by elapsed minutes descending', () => {
  const notifications = createTruckQueueNotifications(
    [
      createQueue({
        rowKey: 'waiting-load',
        sequence: 2,
        carConfirm: '2026-04-23T10:04:00+07:00',
      }),
      createQueue({
        rowKey: 'waiting-close',
        sequence: 1,
        lastPostPallet: '2026-04-23T10:00:00+07:00',
        packListStatus: 'CHECKERCOMPLETED',
      }),
    ],
    NOW,
  );

  assert.deepEqual(
    notifications.map((notification) => notification.type),
    [NOTIFICATION_TYPES.waitingClose, NOTIFICATION_TYPES.waitingLoad],
  );
});
