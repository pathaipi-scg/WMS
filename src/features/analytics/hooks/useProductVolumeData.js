import { useState, useEffect, useCallback } from 'react';
import { getAnalyticsProductVolume } from '../../../services/analyticsService';
import { useAnalyticsRealtimeContext } from '../realtime/AnalyticsRealtimeProvider';

export function useProductVolumeData(preset, dateFrom, dateTo) {
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
      setRestData(await getAnalyticsProductVolume(preset, dateFrom, dateTo));
    } catch {
      setRestError('ไม่สามารถโหลดข้อมูลปริมาณสินค้าได้');
    } finally {
      setRestLoading(false);
    }
  }, [preset, dateFrom, dateTo]);

  useEffect(() => { if (useRealtime) return; loadData(); }, [useRealtime, loadData]);

  if (useRealtime) {
    return { data: realtime.snapshot?.product_volume ?? null, loading: realtime.isLoading, error: realtime.error, refetch: () => {} };
  }

  return { data: restData, loading: restLoading, error: restError, refetch: loadData };
}
