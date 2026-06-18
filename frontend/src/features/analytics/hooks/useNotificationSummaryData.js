import { useState, useEffect, useCallback } from 'react';
import { getAnalyticsNotificationSummary } from '../../../services/analyticsService';
import { useAnalyticsRealtimeContext } from '../realtime/AnalyticsRealtimeProvider';

export function useNotificationSummaryData(preset, dateFrom, dateTo) {
  // วันนี้รับสดผ่าน WebSocket (จาก provider); ช่วงย้อนหลังใช้ REST
  const realtime = useAnalyticsRealtimeContext();
  const useRealtime = preset === 'today';

  const [restData,    setRestData]    = useState(null);
  const [restLoading, setRestLoading] = useState(true);
  const [restError,   setRestError]   = useState(null);

  const loadData = useCallback(async () => {
    if (preset === 'custom' && (!dateFrom || !dateTo)) return;
    setRestLoading(true);
    setRestError(null);
    try {
      setRestData(await getAnalyticsNotificationSummary(preset, dateFrom, dateTo));
    } catch {
      setRestError('ไม่สามารถโหลดข้อมูลการแจ้งเตือนได้');
    } finally {
      setRestLoading(false);
    }
  }, [preset, dateFrom, dateTo]);

  useEffect(() => { if (useRealtime) return; loadData(); }, [useRealtime, loadData]);

  if (useRealtime) {
    const snapshotReady = realtime.snapshot != null;
    const summaryData = snapshotReady ? realtime.snapshot.notification_summary : undefined;
    const keyMissing = snapshotReady && summaryData === undefined;
    return {
      data: summaryData ?? null,
      loading: realtime.isLoading,
      error: realtime.error ?? (keyMissing ? 'ข้อมูลการแจ้งเตือนยังไม่พร้อม' : null),
      refetch: () => {},
    };
  }

  return { data: restData, loading: restLoading, error: restError, refetch: loadData };
}
