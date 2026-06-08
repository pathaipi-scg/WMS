import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { NOTIFICATION_SEVERITIES } from '../constants/notificationRules.js';
import ErrorIcon from '@mui/icons-material/Error';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';


const notificationSeverityStyles = {
  [NOTIFICATION_SEVERITIES.warning]: {
    Icon: InfoOutlinedIcon,
    iconClassName: 'text-yellow-500',
    titleClassName: 'text-yellow-700',
    timeClassName: 'text-yellow-600',
    hoverClassName: 'hover:bg-yellow-50/80 cursor-pointer',
    toastIconBgClassName: 'bg-yellow-50',
    toastBorderClassName: 'border-yellow-100',
  },
  [NOTIFICATION_SEVERITIES.orange]: {
    Icon: WarningAmberIcon,
    iconClassName: 'text-orange-500',
    titleClassName: 'text-orange-700',
    timeClassName: 'text-orange-600',
    hoverClassName: 'hover:bg-orange-50/80 cursor-pointer',
    toastIconBgClassName: 'bg-orange-50',
    toastBorderClassName: 'border-orange-100',
  },
  [NOTIFICATION_SEVERITIES.danger]: {
    Icon: ErrorIcon,
    iconClassName: 'text-red-500',
    titleClassName: 'text-red-700',
    timeClassName: 'text-red-600',
    hoverClassName: 'hover:bg-red-50/80 cursor-pointer',
    toastIconBgClassName: 'bg-red-50',
    toastBorderClassName: 'border-red-100',
  },
};

const defaultNotificationSeverityStyle = {
  Icon: InfoOutlinedIcon,
  iconClassName: 'text-red-500',
  titleClassName: 'text-gray-900',
  timeClassName: 'text-gray-400',
  hoverClassName: 'hover:bg-red-50/70 cursor-pointer',
  toastIconBgClassName: 'bg-red-50',
  toastBorderClassName: 'border-gray-100',
};

export function getNotificationSeverityStyle(severity) {
  return notificationSeverityStyles[severity] ?? defaultNotificationSeverityStyle;
}
