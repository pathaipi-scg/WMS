import { useState, useEffect, useCallback } from 'react';
import { getAnalyticsThroughputByTruckType } from '../../../services/analyticsService';

// ปริมาณรถเข้าตามช่วงเวลา แยกตามประเภทรถ (REST — รีเฟรชเมื่อเปลี่ยน preset/group/ช่วงวันที่)
export function useThroughputByTruckTypeData(preset, groupBy, dateFrom, dateTo) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    if (preset === 'custom' && (!dateFrom || !dateTo)) return;
    setLoading(true);
    setError(null);
    try {
      setData(await getAnalyticsThroughputByTruckType(preset, groupBy, dateFrom, dateTo));
    } catch {
      setError('ไม่สามารถโหลดข้อมูลปริมาณรถได้');
    } finally {
      setLoading(false);
    }
  }, [preset, groupBy, dateFrom, dateTo]);

  useEffect(() => { loadData(); }, [loadData]);

  return { data, loading, error, refetch: loadData };
}
