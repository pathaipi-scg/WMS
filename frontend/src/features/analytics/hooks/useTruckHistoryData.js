import { useState, useEffect, useCallback } from 'react';
import { getAnalyticsTruckHistory } from '../../../services/analyticsService';

// ประวัติรถย้อนหลัง N คันล่าสุด — REST ล้วน (ช่วงเวลาตาม date picker ของหน้าวิเคราะห์)
export function useTruckHistoryData(preset, dateFrom, dateTo, limit = 100) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    if (preset === 'custom' && (!dateFrom || !dateTo)) return;
    setLoading(true);
    setError(null);
    try {
      setData(await getAnalyticsTruckHistory(preset, dateFrom, dateTo, limit));
    } catch {
      setError('ไม่สามารถโหลดข้อมูลประวัติรถได้');
    } finally {
      setLoading(false);
    }
  }, [preset, dateFrom, dateTo, limit]);

  useEffect(() => { loadData(); }, [loadData]);

  return { data, loading, error, refetch: loadData };
}
