import { useEffect, useMemo, useRef, useState } from 'react';
import { useLatestNotificationToast } from './useLatestNotificationToast.js';
import { useTruckQueueNotifications } from './useTruckQueueNotifications.js';

function getQueueNotificationKey(queue, index) {
  return queue.rowKey ?? [queue.sequence ?? 'no-seq', queue.licensePlate ?? 'no-plate', index].join('-');
}

export function useNotificationMenuState({ truckQueues }) {
  const [selectedQueue, setSelectedQueue] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!popoverRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const truckQueueNotifications = useTruckQueueNotifications(truckQueues);
  const visibleNotifications = truckQueueNotifications;
  const hasNotifications = visibleNotifications.length > 0;
  const notificationCountLabel = visibleNotifications.length > 99 ? '99+' : visibleNotifications.length;
  const { toastNotifications, dismissToast, dismissAllToasts } = useLatestNotificationToast(truckQueueNotifications);
  const truckQueueMap = useMemo(
    () => new Map((truckQueues ?? []).map((queue, index) => [getQueueNotificationKey(queue, index), queue])),
    [truckQueues],
  );

  const close = () => setIsOpen(false);

  const handleNotificationClick = (notification) => {
    const queue = notification.queueKey
      ? truckQueueMap.get(notification.queueKey) ?? notification.queue
      : notification.queue;

    if (!queue) {
      return;
    }

    setSelectedQueue(queue);
    close();
  };

  return {
    isOpen,
    popoverRef,
    toggle: () => setIsOpen((current) => !current),
    visibleNotifications,
    hasNotifications,
    notificationCountLabel,
    toastNotifications,
    dismissToast,
    dismissAllToasts,
    selectedQueue,
    closeSelectedQueue: () => setSelectedQueue(null),
    handleNotificationClick,
  };
}
