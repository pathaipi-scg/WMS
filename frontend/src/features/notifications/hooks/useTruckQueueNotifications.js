import { useEffect, useMemo } from 'react';
import { useLiveClock } from '@/shared/hooks/useLiveClock.js';
import { createTruckQueueNotifications } from '../utils/createTruckQueueNotifications.js';

export function useTruckQueueNotifications(truckQueues = []) {
  const now = useLiveClock();

  const notifications = useMemo(
    () => createTruckQueueNotifications(truckQueues, now),
    [truckQueues, now],
  );

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    console.debug('[notifications] truckQueues debug', {
      now,
      truckQueueCount: truckQueues.length,
      notificationCount: notifications.length,
      notifications: notifications.map((notification) => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        elapsedMinutes: notification.elapsedMinutes,
      })),
    });
  }, [notifications, now, truckQueues]);

  return notifications;
}
