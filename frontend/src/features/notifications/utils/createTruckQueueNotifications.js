import { TRUCK_QUEUE_NOTIFICATION_RULES } from '../constants/notificationRules.js';
import { parseNotificationDate } from '@/shared/utils/dateTime.js';

export { parseNotificationDate };

const MINUTE_IN_MS = 60 * 1000;

function normalizeRuleValue(value) {
  return String(value ?? '').trim().toUpperCase();
}

function getQueueKey(queue, index) {
  return queue.rowKey ?? [queue.sequence ?? 'no-seq', queue.licensePlate ?? 'no-plate', index].join('-');
}

function getRuleStartDate(queue, rule) {
  const fields = rule.startFields ?? [rule.startField];

  for (const field of fields) {
    const date = parseNotificationDate(queue[field]);

    if (date) {
      return date;
    }
  }

  return null;
}

function getRuleCompleteDate(queue, rule) {
  const fields = rule.completeFields ?? [rule.completeField];

  for (const field of fields) {
    const date = parseNotificationDate(queue[field]);

    if (date) {
      return date;
    }
  }

  return null;
}

function matchesRequiredFields(queue, rule) {
  if (!rule.requiredFields?.length) {
    return true;
  }

  return rule.requiredFields.every(({ field, value }) => (
    normalizeRuleValue(queue[field]) === normalizeRuleValue(value)
  ));
}

function createNotification({ queue, queueIndex, rule, startDate, now }) {
  const elapsedMinutes = Math.floor((now.getTime() - startDate.getTime()) / MINUTE_IN_MS);

  if (elapsedMinutes < rule.thresholdMinutes) {
    return null;
  }

  const triggeredAt = new Date(startDate.getTime() + rule.thresholdMinutes * MINUTE_IN_MS);
  const queueKey = getQueueKey(queue, queueIndex);

  return {
    id: `${rule.type}-${queueKey}`,
    type: rule.type,
    severity: rule.severity,
    title: rule.getTitle?.(queue) ?? rule.title,
    description: rule.getDescription(queue, elapsedMinutes),
    queue,
    queueKey,
    licensePlate: queue.licensePlate ?? '',
    sequence: queue.sequence ?? null,
    postLocationName: queue.postLocationName ?? queue.post_location_name ?? '',
    elapsedMinutes,
    thresholdMinutes: rule.thresholdMinutes,
    startedAt: startDate.toISOString(),
    triggeredAt: triggeredAt.toISOString(),
  };
}

export function createTruckQueueNotifications(queues = [], now = new Date()) {
  const currentDate = parseNotificationDate(now);

  if (!currentDate) {
    return [];
  }

  return queues
    .flatMap((queue, queueIndex) =>
      TRUCK_QUEUE_NOTIFICATION_RULES.map((rule) => {
        if (typeof rule.matches === 'function' && !rule.matches(queue)) {
          return null;
        }

        if (!matchesRequiredFields(queue, rule)) {
          return null;
        }

        const startDate = getRuleStartDate(queue, rule);
        const completeDate = getRuleCompleteDate(queue, rule);

        if (!startDate || completeDate) {
          return null;
        }

        return createNotification({
          queue,
          queueIndex,
          rule,
          startDate,
          now: currentDate,
        });
      }),
    )
    .filter(Boolean)
    .sort((firstNotification, secondNotification) => {
      const elapsedDiff = secondNotification.elapsedMinutes - firstNotification.elapsedMinutes;

      if (elapsedDiff !== 0) {
        return elapsedDiff;
      }

      return Number(firstNotification.sequence ?? 0) - Number(secondNotification.sequence ?? 0);
    });
}
