import { useState, useEffect, useCallback, useRef } from 'react';
import { getPredictionMetricsTimeseries } from '../../../services/predictionService';
import { usePredictionRealtimeContext } from '../realtime/PredictionRealtimeProvider';

export function usePredictionMetricsTimeseries(preset, groupBy, dateFrom, dateTo, model = null, live = false) {
  // วันนี้ + รายชั่วโมง + ดูโมเดลล่าสุด รับสดผ่าน WebSocket; กรณีอื่น (ย้อนหลัง/รายวัน/โมเดลเก่า) ใช้ REST
  const realtime = usePredictionRealtimeContext();
  const useRealtime = preset === 'today' && groupBy === 'hour' && live;

  const [restData, setRestData] = useState(null);
  const [restLoading, setRestLoading] = useState(true);
  const [restError, setRestError] = useState(null);
  const requestIdRef = useRef(0);

  const loadData = useCallback(async () => {
    if (preset === 'custom' && (!dateFrom || !dateTo)) return;
    const reqId = ++requestIdRef.current;
    setRestLoading(true);
    setRestError(null);
    try {
      const result = await getPredictionMetricsTimeseries(preset, groupBy, dateFrom, dateTo, model);
      if (reqId !== requestIdRef.current) return;
      setRestData(result);
      setRestError(null);
    } catch {
      if (reqId !== requestIdRef.current) return;
      setRestError('ไม่สามารถโหลดข้อมูลแนวโน้มผลโมเดลได้');
    } finally {
      if (reqId === requestIdRef.current) setRestLoading(false);
    }
  }, [preset, groupBy, dateFrom, dateTo, model?.model, model?.version]);

  useEffect(() => {
    if (useRealtime) return; // วันนี้+รายชั่วโมง ใช้ WebSocket จาก provider
    loadData();
  }, [useRealtime, loadData]);

  if (useRealtime) {
    return {
      data: realtime.snapshot?.metrics_timeseries ?? null,
      loading: realtime.isLoading,
      error: realtime.error,
      refetch: () => {},
    };
  }

  return { data: restData, loading: restLoading, error: restError, refetch: loadData };
}
