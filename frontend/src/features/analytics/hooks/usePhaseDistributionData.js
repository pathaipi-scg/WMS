import { useState, useEffect, useCallback } from 'react';
import { getAnalyticsPhaseDistribution } from '../../../services/analyticsService';

// การกระจายเวลา 5 ช่วง แยกตามประเภทรถ (box plot) — REST, ดึงทุก phase ในครั้งเดียวต่อ group_by
export function usePhaseDistributionData(preset, groupBy, dateFrom, dateTo) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    if (preset === 'custom' && (!dateFrom || !dateTo)) return;
    setLoading(true);
    setError(null);
    try {
      setData(await getAnalyticsPhaseDistribution(preset, groupBy, dateFrom, dateTo));
    } catch {
      setError('ไม่สามารถโหลดข้อมูลการกระจายเวลาแต่ละช่วงได้');
    } finally {
      setLoading(false);
    }
  }, [preset, groupBy, dateFrom, dateTo]);

  useEffect(() => { loadData(); }, [loadData]);

  return { data, loading, error, refetch: loadData };
}
