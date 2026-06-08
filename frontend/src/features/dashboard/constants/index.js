import {
  AlertTriangle,
  CheckCircle2,
  Hourglass,
  Inbox,
  Package,
  RefreshCw,
  Truck,
} from 'lucide-react';

export const DASHBOARD_LOAD_ERROR = 'ไม่สามารถโหลดข้อมูลแดชบอร์ดได้';
export const EMPTY_LAST_UPDATED_LABEL = 'ไม่มีข้อมูลเวลาอัปเดต';
export const DASHBOARD_SNAPSHOT_PATH = '/dashboard/snapshot/';
export const DASHBOARD_SOCKET_PATH = '/ws/dashboard/stream/';
export const DASHBOARD_SNAPSHOT_EVENT = 'dashboard.snapshot';

export const WAITING_TIME_LIMITS = {
  min: 0,
  warning: 60,
  danger: 120,
  maxProgress: 150,
};

export const SUMMARY_CARD_ITEMS = [
  {
    id: 'total_trucks',
    title: 'รถทั้งหมด',
    subtitle: 'รถเข้าทั้งหมดในวันนี้',
    colorTheme: 'blue',
    icon: Truck,
    getValue: ({ summaryData }) => summaryData.total_trucks || 0,
  },
  {
    id: 'waiting_queue',
    title: 'รอคิว',
    subtitle: 'รถที่รอลานจ่าย',
    colorTheme: 'yellow',
    icon: Hourglass,
    getValue: ({ summaryData }) => summaryData.waiting_queue || 0,
  },
  {
    id: 'loading',
    title: 'กำลังโหลด',
    subtitle: 'อยู่ระหว่างโหลดสินค้า',
    colorTheme: 'orange',
    icon: Package,
    getValue: ({ summaryData }) => summaryData.loading || 0,
  },
  {
    id: 'completed',
    title: 'เสร็จแล้ว',
    subtitle: 'ดำเนินการเสร็จสิ้น',
    colorTheme: 'green',
    icon: CheckCircle2,
    getValue: ({ summaryData }) => summaryData.completed || 0,
  },
  {
    id: 'available_bays',
    title: 'ช่องจ่ายว่าง',
    subtitle: 'พร้อมใช้งาน',
    colorTheme: 'green2',
    icon: Inbox,
    getValue: ({ yardStats }) => yardStats.availableBays || 0,
  },
  {
    id: 'loading_bays',
    title: 'ช่องจ่ายโหลด',
    subtitle: 'ใช้งานอยู่',
    colorTheme: 'blue2',
    icon: RefreshCw,
    getValue: ({ yardStats }) => yardStats.loadingBays || 0,
  },
  {
    id: 'overtime_trucks',
    title: 'รถที่ใช้เวลาเกิน',
    subtitle: 'เกินเวลามาตรฐาน',
    colorTheme: 'red',
    icon: AlertTriangle,
    getValue: ({ summaryData }) => summaryData.overtime_trucks || 0,
  },
];
