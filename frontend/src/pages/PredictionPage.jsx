import { useRef, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { LastUpdatedStatus } from '../shared/components/LastUpdatedStatus';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { PageLoadingState } from '../shared/components/PageLoadingState';
import { usePredictionData, MetricCard, PredictionToolbar, PredictionTable, PredictionPagination } from '../features/prediction';

export function PredictionPage({ onNavigate }) {
  const tableScrollRef = useRef(null);
  const {
    data, loading, error, lastUpdated,
    metrics, trucks, maxErrorMin,
    queueTypeOptions, filteredTrucks, paginatedTrucks,
    totalPages, safePage, startRow, endRow,
    searchTerm, setSearchTerm,
    queueTypeFilter, setQueueTypeFilter,
    statusFilter, setStatusFilter,
    currentPage, setCurrentPage,
    pageSize, setPageSize,
  } = usePredictionData();

  useEffect(() => {
    if (tableScrollRef.current) tableScrollRef.current.scrollTop = 0;
  }, [currentPage]);

  const handleSearchChange = (value) => { setSearchTerm(value); setCurrentPage(1); };
  const handleQueueTypeChange = (value) => { setQueueTypeFilter(value); setCurrentPage(1); };
  const handleStatusChange = (value) => { setStatusFilter(value); setCurrentPage(1); };
  const handlePageSizeChange = (value) => { setPageSize(value); setCurrentPage(1); };

  if (loading && !data) {
    return <PageLoadingState activePage="predictions" onNavigate={onNavigate} />;
  }

  return (
    <DashboardLayout activePage="predictions" onNavigate={onNavigate}>
      <div className="flex flex-col h-[calc(100dvh-7.5rem)]">

        {/* Title row */}
        <div className="shrink-0 mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">รายงานผลโมเดล</h2>
          <LastUpdatedStatus capturedAt={lastUpdated} />
        </div>

        {/* Metric cards */}
        <div className="shrink-0 mb-5 grid grid-cols-2 gap-5 md:grid-cols-4">
          <MetricCard
            label="MAE (ค่าเฉลี่ยคลาดเคลื่อน)"
            value={metrics.mae}
            unit="นาที"
            icon={TrendingUp}
            color="blue"
            subtitle={`จาก ${metrics.n ?? 0} คันที่เสร็จแล้ว`}
          />
          <MetricCard
            label="RMSE"
            value={metrics.rmse}
            unit="นาที"
            icon={AlertCircle}
            color="red"
            subtitle={maxErrorMin != null ? `ผิดพลาดสูงสุด ${maxErrorMin} นาที` : undefined}
          />
          <MetricCard
            label="ความแม่นยำ (±15 นาที)"
            value={metrics.accuracy15}
            unit="%"
            icon={CheckCircle2}
            color="green"
            subtitle={metrics.n ? `${Math.round((metrics.accuracy15 / 100) * metrics.n)} จาก ${metrics.n} คัน` : undefined}
          />
          <MetricCard
            label="รถทั้งหมดวันนี้"
            value={data?.total ?? null}
            unit="คัน"
            icon={Clock}
            color="gray"
            subtitle={data ? `เสร็จแล้ว ${data.completed} คัน` : ''}
          />
        </div>

        {/* Error state */}
        {error && (
          <div className="shrink-0 mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Table card */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <PredictionToolbar
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            queueTypeFilter={queueTypeFilter}
            onQueueTypeChange={handleQueueTypeChange}
            queueTypeOptions={queueTypeOptions}
            statusFilter={statusFilter}
            onStatusChange={handleStatusChange}
            filteredTrucks={filteredTrucks}
          />
          <PredictionTable
            tableScrollRef={tableScrollRef}
            loading={loading}
            paginatedTrucks={paginatedTrucks}
            filteredTrucks={filteredTrucks}
            trucks={trucks}
            currentPage={currentPage}
          />
          <PredictionPagination
            loading={loading}
            safePage={safePage}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
            onPageChange={setCurrentPage}
            startRow={startRow}
            endRow={endRow}
            filteredTrucks={filteredTrucks}
          />
        </div>

      </div>
    </DashboardLayout>
  );
}
