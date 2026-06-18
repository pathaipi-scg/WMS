import { useDashboardRealtime } from '@/features/dashboard/realtime/DashboardRealtimeProvider';

const EMPTY_NOTIFICATIONS = [];

export function useBackendNotifications() {
  const { snapshot } = useDashboardRealtime();
  return snapshot?.notifications ?? EMPTY_NOTIFICATIONS;
}
