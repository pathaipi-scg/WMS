import { useState, useEffect, useCallback } from 'react';
import { getAnalyticsHourlyInOut } from '../../../services/analyticsService';

// รถเข้า/ออก รายชั่วโมง แยกตามประเภทรถ (REST) — คืน { in: [...], out: [...] }
export function useHourlyInOutData(preset, dateFrom, dateTo) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    if (preset === 'custom' && (!dateFrom || !dateTo)) return;
    setLoading(true);
    setError(null);
    try {
      setData(await getAnalyticsHourlyInOut(preset, dateFrom, dateTo));
    } catch {
      setError('ไม่สามารถโหลดข้อมูลรถเข้า/ออกรายชั่วโมงได้');
    } finally {
      setLoading(false);
    }
  }, [preset, dateFrom, dateTo]);

  useEffect(() => { loadData(); }, [loadData]);

  return { data, loading, error, refetch: loadData };
}
