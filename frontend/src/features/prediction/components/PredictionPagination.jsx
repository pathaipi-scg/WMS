import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { PAGE_SIZE_OPTIONS } from '../constants';

export function PredictionPagination({
  loading,
  safePage,
  totalPages,
  pageSize,
  onPageSizeChange,
  onPageChange,
  startRow,
  endRow,
  filteredTrucks,
}) {
  return (
    <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-md text-gray-600">
      <div className="flex items-center gap-2">
        <span>แสดง</span>
        <div className="relative inline-block">
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="appearance-none border border-gray-200 rounded-md px-2 py-1 pr-6 text-md text-gray-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <ChevronDown size={12} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500" />
        </div>
        <span>รายการ</span>
        {!loading && filteredTrucks.length > 0 && (
          <span className="text-gray-400">
            ({startRow}–{endRow} จาก {filteredTrucks.length})
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={safePage === 1}
          className="cursor-pointer rounded p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="หน้าแรก"
        >
          <ChevronLeft size={14} className="inline" />
          <ChevronLeft size={14} className="inline -ml-2" />
        </button>
        <button
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage === 1}
          className="cursor-pointer rounded p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="หน้าก่อนหน้า"
        >
          <ChevronLeft size={14} />
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
          .reduce((acc, p, idx, arr) => {
            if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
            acc.push(p);
            return acc;
          }, [])
          .map((item, idx) =>
            item === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-1 text-gray-400">…</span>
            ) : (
              <button
                key={item}
                onClick={() => onPageChange(item)}
                className={`min-w-[28px] cursor-pointer rounded px-2 py-1 text-md font-medium transition-colors ${
                  safePage === item ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {item}
              </button>
            ),
          )}

        <button
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage === totalPages}
          className="cursor-pointer rounded p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="หน้าถัดไป"
        >
          <ChevronRight size={14} />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={safePage === totalPages}
          className="cursor-pointer rounded p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="หน้าสุดท้าย"
        >
          <ChevronRight size={14} className="inline" />
          <ChevronRight size={14} className="inline -ml-2" />
        </button>
      </div>
    </div>
  );
}
