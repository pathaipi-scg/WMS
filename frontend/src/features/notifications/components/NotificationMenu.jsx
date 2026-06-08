import { Bell } from 'lucide-react';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import { QueueDetailsModal } from '@/features/queue/components/modal/QueueDetailsModal.jsx';
import { useNotificationMenuState } from '../hooks/useNotificationMenuState.js';
import { useNotificationSound } from '../hooks/useNotificationSound.js';
import { getNotificationSeverityStyle } from '../utils/notificationAppearance.js';
import { NotificationToast } from './NotificationToast.jsx';
import CloseIcon from '@mui/icons-material/Close';

export function NotificationMenu({ truckQueues }) {
  const {
    isOpen,
    popoverRef,
    toggle,
    visibleNotifications,
    hasNotifications,
    notificationCountLabel,
    toastNotifications,
    dismissToast,
    dismissAllToasts,
    selectedQueue,
    closeSelectedQueue,
    handleNotificationClick,
  } = useNotificationMenuState({ truckQueues });

  useNotificationSound(visibleNotifications);

  return (
    <>
      <div ref={popoverRef} className="relative">
        <button
          type="button"
          aria-label="เปิดการแจ้งเตือน"
          aria-expanded={isOpen}
          className="relative flex items-center gap-2 rounded-full border border-gray-200 bg-white p-2 cursor-pointer transition-all hover:bg-red-50 active:scale-95"
          onClick={toggle}
        >
          <NotificationsNoneIcon className="h-5 w-5 text-red-500" />
          {hasNotifications && (
            <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
              {notificationCountLabel}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="notification-popover absolute right-0 top-full z-50 mt-3 w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-2xl shadow-gray-500/30 sm:w-96">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <p className="text-base font-bold text-gray-900">การแจ้งเตือน</p>
              </div>
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                {visibleNotifications.length} ใหม่
              </span>
            </div>

            <div className="max-h-96 overflow-y-auto queue-scrollbar">
              {hasNotifications ? (
                visibleNotifications.map((notification) => {
                  const severityStyle = getNotificationSeverityStyle(notification.severity);
                  const SeverityIcon = severityStyle.Icon;

                  return (
                    <button
                      key={notification.id ?? notification.title}
                      type="button"
                      className={`block w-full border-b border-gray-100 px-5 py-4 text-left transition-colors last:border-b-0 ${severityStyle.hoverClassName}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <SeverityIcon className={`mt-0.5 h-5 w-5 shrink-0 ${severityStyle.iconClassName}`} />
                        <div>
                          <p className={`text-base font-bold ${severityStyle.titleClassName}`}>{notification.title}</p>
                          <p className="mt-1 text-sm leading-6 text-gray-600">{notification.description}</p>
                          <p className={`mt-2 text-xs font-medium ${severityStyle.timeClassName}`}>{notification.time}</p>
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm font-semibold text-gray-700">ไม่มีการแจ้งเตือน</p>
                  <p className="mt-1 text-xs text-gray-400">คิวรถทั้งหมดอยู่ในเวลามาตรฐาน</p>
                </div>
              )}
            </div>
          </div>
        )}

        <NotificationToast notifications={toastNotifications} onClose={dismissToast} onCloseAll={dismissAllToasts} />
      </div>

      {selectedQueue ? (
        <QueueDetailsModal queue={selectedQueue} onClose={closeSelectedQueue} />
      ) : null}
    </>
  );
}
