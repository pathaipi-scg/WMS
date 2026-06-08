import { useState, useEffect, useCallback } from 'react';
import { getAnalyticsProductVolume } from '../../../services/analyticsService';

export function useProductVolumeData(preset, dateFrom, dateTo) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetch = useCallback(async () => {
    if (preset === 'custom' && (!dateFrom || !dateTo)) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getAnalyticsProductVolume(preset, dateFrom, dateTo);
      setData(result);
    } catch {
      setError('ไม่สามารถโหลดข้อมูลปริมาณสินค้าได้');
    } finally {
      setLoading(false);
    }
  }, [preset, dateFrom, dateTo]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error };
}
