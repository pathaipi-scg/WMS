import { memo, useState, useRef, useEffect } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { PRESET_OPTIONS } from '../constants';

function CustomPopover({ dateFrom, dateTo, onApply, onClose, anchorRef }) {
  const [from, setFrom] = useState(dateFrom);
  const [to, setTo]     = useState(dateTo);
  const popRef = useRef(null);

  // ปิดเมื่อคลิกนอก
  useEffect(() => {
    function handleClick(e) {
      if (
        popRef.current && !popRef.current.contains(e.target) &&
        anchorRef.current && !anchorRef.current.contains(e.target)
      ) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose, anchorRef]);

  const canApply = from && to && from <= to;

  return (
    <div
      ref={popRef}
      className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-lg"
    >
      <p className="mb-3 text-sm font-semibold text-gray-700">เลือกช่วงวันที่</p>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">วันเริ่มต้น</label>
          <input
            type="date"
            value={from}
            max={to || undefined}
            onClick={(e) => e.target.showPicker?.()}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full cursor-pointer rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-200"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">วันสิ้นสุด</label>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onClick={(e) => e.target.showPicker?.()}
            onChange={(e) => setTo(e.target.value)}
            className="w-full cursor-pointer rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-200"
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 cursor-pointer transition-colors"
        >
          ยกเลิก
        </button>
        <button
          onClick={() => canApply && onApply(from, to)}
          disabled={!canApply}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
            canApply
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          ยืนยัน
        </button>
      </div>
    </div>
  );
}

export const AnalyticsDateRangePicker = memo(function AnalyticsDateRangePicker({
  preset,
  dateFrom,
  dateTo,
  onChange,
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);

  const handlePreset = (value) => {
    setOpen(false);
    onChange({ preset: value, dateFrom: '', dateTo: '' });
  };

  const handleApply = (from, to) => {
    setOpen(false);
    onChange({ preset: 'custom', dateFrom: from, dateTo: to });
  };

  const customLabel = preset === 'custom' && dateFrom && dateTo
    ? `${dateFrom} – ${dateTo}`
    : 'กำหนดเอง';

  return (
    <div className="flex items-center gap-2">
      {/* Preset pills */}
      <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
        {PRESET_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => handlePreset(value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              preset === value
                ? 'bg-white text-red-600 shadow-sm border border-gray-200'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ปุ่ม กำหนดเอง แยก */}
      <div className="relative">
        <button
          ref={btnRef}
          onClick={() => setOpen((v) => !v)}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
            preset === 'custom'
              ? 'border-red-200 bg-red-50 text-red-600'
              : 'border-gray-200 bg-gray-50 text-gray-500 hover:text-gray-700 hover:bg-white'
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          <span className="max-w-40 truncate">{customLabel}</span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <CustomPopover
            dateFrom={dateFrom}
            dateTo={dateTo}
            onApply={handleApply}
            onClose={() => setOpen(false)}
            anchorRef={btnRef}
          />
        )}
      </div>
    </div>
  );
});
