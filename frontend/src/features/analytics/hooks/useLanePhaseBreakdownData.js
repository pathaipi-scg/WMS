import { useState, useEffect, useCallback } from 'react';
import { getAnalyticsLanePhaseBreakdown } from '../../../services/analyticsService';

// เวลาเฉลี่ย 5 ช่วง แยกตามลานจอด (stacked bar) — REST ล้วน (ไม่อยู่ใน snapshot bundle)
export function useLanePhaseBreakdownData(preset, dateFrom, dateTo) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    if (preset === 'custom' && (!dateFrom || !dateTo)) return;
    setLoading(true);
    setError(null);
    try {
      setData(await getAnalyticsLanePhaseBreakdown(preset, dateFrom, dateTo));
    } catch {
      setError('ไม่สามารถโหลดข้อมูลเวลาเฉลี่ยแยกตามลานจอดได้');
    } finally {
      setLoading(false);
    }
  }, [preset, dateFrom, dateTo]);

  useEffect(() => { loadData(); }, [loadData]);

  return { data, loading, error, refetch: loadData };
}
