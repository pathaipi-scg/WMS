import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Cpu, Check } from 'lucide-react';

// Dropdown เลือกโมเดลสำหรับเปรียบเทียบผล — value '' = ทุกโมเดล
// สไตล์ให้เข้าชุดกับปุ่ม "กำหนดเอง" ของ AnalyticsDateRangePicker
export function ModelSelect({ value, options, onChange, isToday = false }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const popRef = useRef(null);

  // ปิดเมื่อคลิกนอก
  useEffect(() => {
    function handleClick(e) {
      if (
        popRef.current && !popRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = options.find((o) => o.value === value);
  const label = selected?.label ?? '—';
  // ไฮไลต์แดงเมื่อกำลังดูโมเดลเก่า (ไม่ใช่ตัวล่าสุด) = อยู่ในโหมดเทียบย้อนหลัง
  const active = !!selected && !selected.isLatest;

  const handleSelect = (val) => {
    setOpen(false);
    onChange(val);
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
          active
            ? 'border-red-200 bg-red-50 text-red-600'
            : 'border-gray-200 bg-gray-50 text-gray-500 hover:text-gray-700 hover:bg-white'
        }`}
      >
        <Cpu className="h-4 w-4" />
        <span className="max-w-40 truncate">{label}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          ref={popRef}
          className="absolute left-0 top-full z-50 mt-2 w-60 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg"
        >
          {options.map((o) => {
            const isSel = o.value === value;
            const disabled = !!o.disabled;
            return (
              <button
                key={o.value}
                onClick={() => !disabled && handleSelect(o.value)}
                disabled={disabled}
                title={disabled ? 'ไม่ได้ใช้ในช่วงวันที่ที่เลือก' : undefined}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  disabled
                    ? 'text-gray-300 cursor-not-allowed'
                    : isSel
                      ? 'bg-red-50 text-red-600 font-medium cursor-pointer'
                      : 'text-gray-600 hover:bg-gray-50 cursor-pointer'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <Check className={`h-3.5 w-3.5 shrink-0 ${isSel ? 'opacity-100' : 'opacity-0'}`} />
                  <span className="truncate">{o.label}</span>
                </span>
                {o.isLatest ? (
                  <span className="shrink-0 rounded-md bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
                    ล่าสุด
                  </span>
                ) : (
                  // โมเดลเก่า: วันนี้แสดง "ไม่ได้ใช้", ช่วงย้อนหลังแสดงวันที่ใช้ล่าสุดเสมอ
                  <span className={`shrink-0 text-xs ${disabled ? 'text-gray-300' : 'text-gray-400'}`}>
                    {!isToday && o.lastUsed ? `ใช้ล่าสุด ${o.lastUsed}` : 'ไม่ได้ใช้'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
