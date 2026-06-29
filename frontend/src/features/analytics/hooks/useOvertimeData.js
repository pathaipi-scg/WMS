import { useState, useEffect, useCallback } from 'react';
import { getAnalyticsOvertime } from '../../../services/analyticsService';

// ข้อมูลรถใช้เวลาเกินกำหนด — REST ล้วน
export function useOvertimeData(preset, dateFrom, dateTo, limit = 200) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    if (preset === 'custom' && (!dateFrom || !dateTo)) return;
    setLoading(true);
    setError(null);
    try {
      setData(await getAnalyticsOvertime(preset, dateFrom, dateTo, limit));
    } catch {
      setError('ไม่สามารถโหลดข้อมูลรถใช้เวลาเกินได้');
    } finally {
      setLoading(false);
    }
  }, [preset, dateFrom, dateTo, limit]);

  useEffect(() => { loadData(); }, [loadData]);

  return { data, loading, error, refetch: loadData };
}
