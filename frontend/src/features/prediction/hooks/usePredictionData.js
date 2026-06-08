import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getPredictionReport } from '../../../services/predictionService';
import { REFRESH_INTERVAL_MS } from '../constants';

export function usePredictionData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const timerRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [queueTypeFilter, setQueueTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fetchData = useCallback(async () => {
    try {
      const result = await getPredictionReport();
      setData(result);
      setLastUpdated(new Date());
      setError(null);
    } catch {
      setError('ไม่สามารถดึงข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    timerRef.current = setInterval(fetchData, REFRESH_INTERVAL_MS);
    return () => clearInterval(timerRef.current);
  }, [fetchData]);

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
    lastUpdated,
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
