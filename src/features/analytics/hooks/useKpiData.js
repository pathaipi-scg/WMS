import { useState, useEffect, useCallback } from 'react';
import { getAnalyticsKpiSummary } from '../../../services/analyticsService';
import { useAnalyticsRealtimeContext } from '../realtime/AnalyticsRealtimeProvider';

export function useKpiData(preset, dateFrom, dateTo) {
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
      setRestData(await getAnalyticsKpiSummary(preset, dateFrom, dateTo));
    } catch {
      setRestError('ไม่สามารถโหลดข้อมูล KPI ได้');
    } finally {
      setRestLoading(false);
    }
  }, [preset, dateFrom, dateTo]);

  useEffect(() => { if (useRealtime) return; loadData(); }, [useRealtime, loadData]);

  if (useRealtime) {
    return { data: realtime.snapshot?.kpi ?? null, loading: realtime.isLoading, error: realtime.error, refetch: () => {} };
  }

  return { data: restData, loading: restLoading, error: restError, refetch: loadData };
}
