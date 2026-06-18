import { createRealtimeContext } from '../../../shared/hooks/createRealtimeContext';
import { getAnalyticsSnapshot, getAnalyticsSocketUrl } from '../../../services/analyticsService';
import { ANALYTICS_SNAPSHOT_EVENT } from '../constants';

// Provider เปิด WebSocket เส้นเดียวสำหรับ snapshot "วันนี้" ของ Analytics แล้วแชร์ให้
// ทุก data hook (KPI + charts) ในหน้า — เปิดเฉพาะตอน preset === 'today' (ช่วงย้อนหลังใช้ REST)
const { Provider, useRealtimeContext } = createRealtimeContext(({ preset }) => {
  const isToday = preset === 'today';
  return {
    socketUrl: getAnalyticsSocketUrl(),
    event: ANALYTICS_SNAPSHOT_EVENT,
    fetchInitial: getAnalyticsSnapshot,
    enabled: isToday,
    loadErrorMessage: 'ไม่สามารถโหลดข้อมูลวิเคราะห์ได้',
    extra: { isToday },
  };
});

export const AnalyticsRealtimeProvider = Provider;
export const useAnalyticsRealtimeContext = useRealtimeContext;
