import { useState, useEffect, useCallback } from 'react';
import { getAnalyticsAvgTimeByTruckType } from '../../../services/analyticsService';

export function useAvgTimeByTruckTypeData(preset, groupBy, dateFrom, dateTo) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetch = useCallback(async () => {
    if (preset === 'custom' && (!dateFrom || !dateTo)) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getAnalyticsAvgTimeByTruckType(preset, groupBy, dateFrom, dateTo);
      setData(result);
    } catch {
      setError('ไม่สามารถโหลดข้อมูลเวลาเฉลี่ยตามประเภทรถได้');
    } finally {
      setLoading(false);
    }
  }, [preset, groupBy, dateFrom, dateTo]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
