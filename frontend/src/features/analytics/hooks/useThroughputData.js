import { useState, useEffect, useCallback } from 'react';
import { getAnalyticsThroughput } from '../../../services/analyticsService';

export function useThroughputData(preset, groupBy, dateFrom, dateTo) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (preset === 'custom' && (!dateFrom || !dateTo)) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getAnalyticsThroughput(preset, groupBy, dateFrom, dateTo);
      setData(result);
    } catch {
      setError('ไม่สามารถโหลดข้อมูลปริมาณรถได้');
    } finally {
      setLoading(false);
    }
  }, [preset, groupBy, dateFrom, dateTo]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
