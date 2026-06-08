import CloseIcon from '@mui/icons-material/Close';
import { getNotificationSeverityStyle } from '../utils/notificationAppearance.js';

const SEVERITY_LEFT_BORDER = {
  warning: 'border-l-yellow-400',
  orange: 'border-l-orange-400',
  danger: 'border-l-red-500',
};

const SEVERITY_ROW_BG = {
  warning: 'bg-yellow-50/40',
  orange: 'bg-orange-50/40',
  danger: 'bg-red-50/40',
};

export function NotificationToast({ notifications = [], onClose, onCloseAll }) {
  if (!notifications.length) {
    return null;
  }

  const reversed = [...notifications].reverse();

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl shadow-slate-900/25 ring-1 ring-slate-900/8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold text-slate-800">การแจ้งเตือน</span>
          {/* <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold leading-none text-white">
            {notifications.length}
          </span> */}
        </div>
        <button
          type="button"
          onClick={onCloseAll}
          className="cursor-pointer text-xs font-semibold text-slate-500 transition-colors hover:text-slate-800"
        >
          ปิดทั้งหมด
        </button>
      </div>

      {/* Scrollable list */}
      <div className="queue-scrollbar max-h-[min(32rem,calc(100vh-8rem))] overflow-y-auto divide-y divide-slate-200">
        {reversed.map((notification) => {
          const severityStyle = getNotificationSeverityStyle(notification.severity);
          const SeverityIcon = severityStyle.Icon;
          const leftBorder = SEVERITY_LEFT_BORDER[notification.severity] ?? 'border-l-slate-300';
          const rowBg = SEVERITY_ROW_BG[notification.severity] ?? '';

          return (
            <div
              key={notification.id}
              className={`notification-toast border-l-4 ${leftBorder} ${rowBg}`}
            >
              <div className="flex items-start gap-3 px-5 py-4">
                <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${severityStyle.toastIconBgClassName}`}>
                  <SeverityIcon className={`h-5 w-5 ${severityStyle.iconClassName}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-base font-bold ${severityStyle.titleClassName}`}>
                    {notification.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{notification.description}</p>
                </div>
                <button
                  type="button"
                  aria-label="ปิดการแจ้งเตือน"
                  className="cursor-pointer rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
                  onClick={() => onClose(notification.id)}
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
