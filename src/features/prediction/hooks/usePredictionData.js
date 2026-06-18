import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getPredictionLog } from '../../../services/predictionService';
import { usePredictionRealtimeContext } from '../realtime/PredictionRealtimeProvider';

export function usePredictionData(preset = 'today', dateFrom = '', dateTo = '', model = null, live = false) {
  // มุมมอง "วันนี้" + ดูโมเดลล่าสุด รับข้อมูลสดผ่าน WebSocket (snapshot คือข้อมูลของโมเดล
  // ล่าสุดอยู่แล้ว); ช่วงย้อนหลัง หรือดูโมเดลเก่า ใช้ REST ที่กรองตามโมเดล
  const realtime = usePredictionRealtimeContext();
  const useRealtime = preset === 'today' && live;

  const [restData, setRestData] = useState(null);
  const [restLoading, setRestLoading] = useState(true);
  const [restError, setRestError] = useState(null);
  const requestIdRef = useRef(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [queueTypeFilter, setQueueTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fetchData = useCallback(async () => {
    if (preset === 'custom' && (!dateFrom || !dateTo)) return;
    // จับ token ของ request นี้ — commit ผลเฉพาะเมื่อยังเป็น request ล่าสุด
    // กัน response เก่าเขียนทับข้อมูลช่วงใหม่
    const reqId = ++requestIdRef.current;
    setRestLoading(true);
    setRestData(null);
    try {
      const result = await getPredictionLog(preset, dateFrom, dateTo, model);
      if (reqId !== requestIdRef.current) return;
      setRestData(result);
      setRestError(null);
    } catch {
      if (reqId !== requestIdRef.current) return;
      setRestError('ไม่สามารถดึงข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      if (reqId === requestIdRef.current) setRestLoading(false);
    }
  }, [preset, dateFrom, dateTo, model?.model, model?.version]);

  useEffect(() => {
    if (useRealtime) return; // วันนี้ใช้ WebSocket จาก provider ไม่ต้อง fetch/poll
    fetchData();
  }, [useRealtime, fetchData]);

  const data = useRealtime ? realtime.snapshot?.log ?? null : restData;
  const loading = useRealtime ? realtime.isLoading : restLoading;
  const error = useRealtime ? realtime.error : restError;

  // กลับไปหน้าแรกเมื่อเปลี่ยนช่วงวันที่/โมเดล กันหน้าค้างเกินจำนวนแถว
  useEffect(() => {
    setCurrentPage(1);
  }, [preset, dateFrom, dateTo, model?.model, model?.version]);

  const trucks = data?.trucks ?? [];

  const maxErrorMin = useMemo(() => {
    const vals = trucks.map((t) => Math.abs(t.errorMin)).filter((v) => v != null && !isNaN(v));
    return vals.length ? Math.max(...vals) : null;
  }, [trucks]);

  const queueTypeOptions = useMemo(() => {
    const types = [...new Set(trucks.map((t) => t.queueType).filter(Boolean))];
    return [{ value: 'all', label: 'ทุกประเภทคิว' }, ...types.map((t) => ({ value: t, label: t }))];
  }, [trucks]);

  const filteredTrucks = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return trucks
      .filter((t) => {
        const matchSearch =
          !term ||
          (t.licensePlate ?? '').toLowerCase().replace(/\s+/g, '').includes(term.replace(/\s+/g, '')) ||
          (t.licensePlate ?? '').toLowerCase().includes(term);
        const matchQueue = queueTypeFilter === 'all' || t.queueType === queueTypeFilter;
        const matchStatus =
          statusFilter === 'all' ||
          (statusFilter === 'completed' && t.isCompleted) ||
          (statusFilter === 'in_progress' && !t.isCompleted);
        return matchSearch && matchQueue && matchStatus;
      })
      .sort((a, b) => {
        if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
        return (b.arrivalTime ?? '').localeCompare(a.arrivalTime ?? '');
      });
  }, [trucks, searchTerm, queueTypeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTrucks.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTrucks = filteredTrucks.slice((safePage - 1) * pageSize, safePage * pageSize);
  const startRow = filteredTrucks.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endRow = Math.min(safePage * pageSize, filteredTrucks.length);

  return {
    data,
    loading,
    error,
    metrics: data?.metrics ?? {},
    trucks,
    maxErrorMin,
    queueTypeOptions,
    filteredTrucks,
    paginatedTrucks,
    totalPages,
    safePage,
    startRow,
    endRow,
    searchTerm,
    setSearchTerm,
    queueTypeFilter,
    setQueueTypeFilter,
    statusFilter,
    setStatusFilter,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
  };
}
