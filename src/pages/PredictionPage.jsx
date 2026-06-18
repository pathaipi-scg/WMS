import { useRef, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { PageLoadingState } from '../shared/components/feedback/PageLoadingState';
import { ConnectionStatusBanner } from '../shared/components/feedback/ConnectionStatusBanner';
import { usePredictionData, usePredictionModels, MetricCard, ModelSelect, PredictionMetricCharts, PredictionToolbar, PredictionTable, PredictionPagination, PredictionRealtimeProvider, usePredictionRealtimeContext } from '../features/prediction';
import { AnalyticsDateRangePicker } from '../features/analytics';

export function PredictionPage() {
  const [preset, setPreset] = useState('today');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [modelValue, setModelValue] = useState('');

  const { options: modelOptions } = usePredictionModels(preset, dateFrom, dateTo);
  const selectedOption = modelOptions.find((o) => o.value === modelValue);
  const selectedModel = selectedOption?.model ?? null;
  const isLatestSelected = !!selectedOption?.isLatest;

  // ถ้ายังไม่ได้เลือก หรือโมเดลที่เลือกไม่มีข้อมูลในช่วงวันที่ปัจจุบัน
  // → เลือกตัวที่ใช้ได้ล่าสุด (เวอร์ชันสูงสุดที่มีข้อมูล) ให้อัตโนมัติ
  useEffect(() => {
    if (!modelOptions.length) return;
    if (!selectedOption || selectedOption.disabled) {
      const fallback = modelOptions.find((o) => !o.disabled) ?? modelOptions[0];
      setModelValue(fallback.value);
    }
  }, [modelOptions, selectedOption]);

  function handleRangeChange({ preset: p, dateFrom: df, dateTo: dt }) {
    setPreset(p);
    setDateFrom(df ?? '');
    setDateTo(dt ?? '');
  }

  // Provider เปิด WebSocket "วันนี้" ครั้งเดียว แล้วแชร์ให้ data hook ทุกตัวในหน้า
  return (
    <PredictionRealtimeProvider preset={preset}>
      <PredictionPageContent
        preset={preset}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onRangeChange={handleRangeChange}
        modelValue={modelValue}
        modelOptions={modelOptions}
        selectedModel={selectedModel}
        isLatestSelected={isLatestSelected}
        onModelChange={setModelValue}
      />
    </PredictionRealtimeProvider>
  );
}

function PredictionPageContent({ preset, dateFrom, dateTo, onRangeChange, modelValue, modelOptions, selectedModel, isLatestSelected, onModelChange }) {
  const tableScrollRef = useRef(null);
  const isToday = preset === 'today';
  const { connectionStatus } = usePredictionRealtimeContext();

  const {
    data, loading, error,
    metrics, trucks, maxErrorMin,
    queueTypeOptions, filteredTrucks, paginatedTrucks,
    totalPages, safePage, startRow, endRow,
    searchTerm, setSearchTerm,
    queueTypeFilter, setQueueTypeFilter,
    statusFilter, setStatusFilter,
    currentPage, setCurrentPage,
    pageSize, setPageSize,
  } = usePredictionData(preset, dateFrom, dateTo, selectedModel, isLatestSelected);

  useEffect(() => {
    if (tableScrollRef.current) tableScrollRef.current.scrollTop = 0;
  }, [currentPage]);

  const handleSearchChange = (value) => { setSearchTerm(value); setCurrentPage(1); };
  const handleQueueTypeChange = (value) => { setQueueTypeFilter(value); setCurrentPage(1); };
  const handleStatusChange = (value) => { setStatusFilter(value); setCurrentPage(1); };
  const handlePageSizeChange = (value) => { setPageSize(value); setCurrentPage(1); };

  if (loading && !data) {
    return <PageLoadingState />;
  }

  // วันนี้ + ดูโมเดลล่าสุด = สตรีมสดผ่าน WebSocket; กรณีอื่นใช้ REST
  const liveView = isToday && isLatestSelected;

  return (
    <DashboardLayout showNotifications={false}>
      <ConnectionStatusBanner status={liveView ? connectionStatus : 'open'} />
      <div className="flex flex-col pb-5">

        {/* Title row */}
        <div className="shrink-0 mb-5 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-gray-800">รายงานผลโมเดล</h2>
          <div className="flex flex-wrap items-center gap-3">
            <ModelSelect value={modelValue} options={modelOptions} onChange={onModelChange} isToday={isToday} />
            <AnalyticsDateRangePicker
              preset={preset}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onChange={onRangeChange}
            />
          </div>
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
            label={isToday ? 'รถทั้งหมดวันนี้' : 'รถทั้งหมดในช่วงนี้'}
            value={data?.total ?? null}
            unit="คัน"
            icon={Clock}
            color="gray"
            subtitle={data ? `เสร็จแล้ว ${data.completed} คัน` : ''}
          />
        </div>

        {/* Metric trend charts — MAE/RMSE (left) + R² (right) */}
        <div className="shrink-0 mb-5">
          <PredictionMetricCharts preset={preset} dateFrom={dateFrom} dateTo={dateTo} model={selectedModel} live={isLatestSelected} />
        </div>

        {/* Error state */}
        {error && (
          <div className="shrink-0 mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Table card */}
        <div className="h-130 shrink-0 flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
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
            hasModelFilter={!!selectedModel}
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
