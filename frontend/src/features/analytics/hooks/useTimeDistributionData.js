import { useState, useEffect, useCallback } from 'react';
import { getAnalyticsTimeDistribution } from '../../../services/analyticsService';

// การกระจายเวลารวม (box plot) ตามช่วงเวลา — REST, รีเฟรชเมื่อเปลี่ยน preset/group/ช่วงวันที่
export function useTimeDistributionData(preset, groupBy, dateFrom, dateTo) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    if (preset === 'custom' && (!dateFrom || !dateTo)) return;
    setLoading(true);
    setError(null);
    try {
      setData(await getAnalyticsTimeDistribution(preset, groupBy, dateFrom, dateTo));
    } catch {
      setError('ไม่สามารถโหลดข้อมูลการกระจายเวลาได้');
    } finally {
      setLoading(false);
    }
  }, [preset, groupBy, dateFrom, dateTo]);

  useEffect(() => { loadData(); }, [loadData]);

  return { data, loading, error, refetch: loadData };
}
