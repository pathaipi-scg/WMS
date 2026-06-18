import { useState, useEffect, useCallback } from 'react';
import { getAnalyticsThroughput } from '../../../services/analyticsService';
import { useAnalyticsRealtimeContext } from '../realtime/AnalyticsRealtimeProvider';

export function useThroughputData(preset, groupBy, dateFrom, dateTo) {
  // วันนี้ + รายชั่วโมง (ค่า default) รับสดผ่าน WebSocket; กรณีอื่นใช้ REST
  const realtime = useAnalyticsRealtimeContext();
  const useRealtime = preset === 'today' && groupBy === 'hour';

  const [restData,    setRestData]    = useState(null);
  const [restLoading, setRestLoading] = useState(true);
  const [restError,   setRestError]   = useState(null);

  const loadData = useCallback(async () => {
    if (preset === 'custom' && (!dateFrom || !dateTo)) return;
    setRestLoading(true);
    setRestError(null);
    try {
      setRestData(await getAnalyticsThroughput(preset, groupBy, dateFrom, dateTo));
    } catch {
      setRestError('ไม่สามารถโหลดข้อมูลปริมาณรถได้');
    } finally {
      setRestLoading(false);
    }
  }, [preset, groupBy, dateFrom, dateTo]);

  useEffect(() => { if (useRealtime) return; loadData(); }, [useRealtime, loadData]);

  if (useRealtime) {
    return { data: realtime.snapshot?.throughput ?? null, loading: realtime.isLoading, error: realtime.error, refetch: () => {} };
  }

  return { data: restData, loading: restLoading, error: restError, refetch: loadData };
}
