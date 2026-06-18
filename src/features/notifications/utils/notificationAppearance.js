import CampaignIcon from '@mui/icons-material/Campaign';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import LogoutIcon from '@mui/icons-material/Logout';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

// สไตล์แยกตาม notification type เพื่อให้แต่ละประเภทมี icon + สีเป็นของตัวเอง
const TYPE_STYLES = {
  'pending-call': {
    Icon: CampaignIcon,
    iconClass:       'text-yellow-500',
    titleClass:      'text-yellow-700',
    timeClass:       'text-yellow-600',
    hoverClass:      'hover:bg-yellow-50/80 cursor-pointer',
    iconBgClass:     'bg-yellow-50',
    toastBorderClass: 'border-yellow-100',
    leftBorder:      'border-l-yellow-400',
    rowBg:           'bg-yellow-50/40',
  },
  'waiting-load': {
    Icon: LocalShippingIcon,
    iconClass:       'text-amber-500',
    titleClass:      'text-amber-700',
    timeClass:       'text-amber-600',
    hoverClass:      'hover:bg-amber-50/80 cursor-pointer',
    iconBgClass:     'bg-amber-50',
    toastBorderClass: 'border-amber-100',
    leftBorder:      'border-l-amber-400',
    rowBg:           'bg-amber-50/40',
  },
  'loading-too-long': {
    Icon: HourglassBottomIcon,
    iconClass:       'text-orange-500',
    titleClass:      'text-orange-700',
    timeClass:       'text-orange-600',
    hoverClass:      'hover:bg-orange-50/80 cursor-pointer',
    iconBgClass:     'bg-orange-50',
    toastBorderClass: 'border-orange-100',
    leftBorder:      'border-l-orange-400',
    rowBg:           'bg-orange-50/40',
  },
  'waiting-close': {
    Icon: AssignmentLateIcon,
    iconClass:       'text-red-500',
    titleClass:      'text-red-700',
    timeClass:       'text-red-600',
    hoverClass:      'hover:bg-red-50/80 cursor-pointer',
    iconBgClass:     'bg-red-50',
    toastBorderClass: 'border-red-100',
    leftBorder:      'border-l-red-400',
    rowBg:           'bg-red-50/40',
  },
  'waiting-post': {
    Icon: CloudUploadIcon,
    iconClass:       'text-rose-600',
    titleClass:      'text-rose-700',
    timeClass:       'text-rose-600',
    hoverClass:      'hover:bg-rose-50/80 cursor-pointer',
    iconBgClass:     'bg-rose-50',
    toastBorderClass: 'border-rose-100',
    leftBorder:      'border-l-rose-500',
    rowBg:           'bg-rose-50/40',
  },
};

const DEFAULT_STYLE = {
  Icon: WarningAmberIcon,
  iconClass:       'text-red-500',
  titleClass:      'text-red-700',
  timeClass:       'text-red-600',
  hoverClass:      'hover:bg-red-50/80 cursor-pointer',
  iconBgClass:     'bg-red-50',
  toastBorderClass: 'border-red-100',
  leftBorder:      'border-l-red-400',
  rowBg:           'bg-red-50/40',
};

export function getNotificationStyle(type) {
  return TYPE_STYLES[type] ?? DEFAULT_STYLE;
}
