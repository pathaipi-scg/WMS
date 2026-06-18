import { ChevronDown, Download, Search } from 'lucide-react';
import { STATUS_OPTIONS } from '../constants';
import { exportToCSV } from '../utils/exportCsv';

export function PredictionToolbar({
  searchTerm,
  onSearchChange,
  queueTypeFilter,
  onQueueTypeChange,
  queueTypeOptions,
  statusFilter,
  onStatusChange,
  filteredTrucks,
}) {
  return (
    <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input
            type="text"
            placeholder="ค้นหาทะเบียนรถ"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 w-48"
          />
        </div>

        {/* Queue type filter */}
        <div className="relative inline-block">
          <select
            value={queueTypeFilter}
            onChange={(e) => onQueueTypeChange(e.target.value)}
            className="appearance-none border border-gray-200 rounded-md px-3 py-1.5 pr-7 text-sm text-gray-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {queueTypeOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-500" />
        </div>

        {/* Status filter */}
        <div className="relative inline-block">
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="appearance-none border border-gray-200 rounded-md px-3 py-1.5 pr-7 text-sm text-gray-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-500" />
        </div>
      </div>

      {/* Export button */}
      <button
        onClick={() => exportToCSV(filteredTrucks)}
        disabled={filteredTrucks.length === 0}
        className="flex items-center gap-1.5 font-semibold rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 cursor-pointer hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Download size={14} />
        Export CSV
      </button>
    </div>
  );
}
