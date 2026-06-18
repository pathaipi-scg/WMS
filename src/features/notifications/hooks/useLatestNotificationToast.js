import { useEffect, useMemo, useRef, useState } from 'react';
import { parseNotificationDate } from '@/shared/utils/dateTime.js';

function getNotificationTimestamp(notification) {
  const triggeredAt = parseNotificationDate(notification?.triggeredAt);
  const startedAt = parseNotificationDate(notification?.startedAt);

  return triggeredAt?.getTime() ?? startedAt?.getTime() ?? 0;
}

export function useLatestNotificationToast(notifications = []) {
  const dismissedNotificationIdsRef = useRef(new Set());
  const [toastNotifications, setToastNotifications] = useState([]);

  const sortedNotifications = useMemo(() => (
    [...notifications].sort(
      (firstNotification, secondNotification) =>
        getNotificationTimestamp(firstNotification) - getNotificationTimestamp(secondNotification),
    )
  ), [notifications]);

  useEffect(() => {
    const nextToastNotifications = sortedNotifications.filter(
      (notification) =>
        notification?.id &&
        !dismissedNotificationIdsRef.current.has(notification.id),
    );

    setToastNotifications(nextToastNotifications);
  }, [sortedNotifications]);

  const dismissToast = (notificationId) => {
    if (notificationId) {
      dismissedNotificationIdsRef.current.add(notificationId);
    }

    setToastNotifications((currentToastNotifications) =>
      currentToastNotifications.filter((notification) => notification.id !== notificationId),
    );
  };

  const dismissAllToasts = () => {
    toastNotifications.forEach((n) => {
      if (n?.id) dismissedNotificationIdsRef.current.add(n.id);
    });
    setToastNotifications([]);
  };

  return {
    toastNotifications,
    dismissToast,
    dismissAllToasts,
  };
}
