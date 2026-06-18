import { memo } from 'react';

export const ChartToggle = memo(function ChartToggle({
  options,
  value,
  onChange,
  disableHour = false,
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
      {options.map((opt) => {
        const disabled = disableHour && opt.value === 'hour';
        return (
          <button
            key={opt.value}
            onClick={() => !disabled && onChange(opt.value)}
            disabled={disabled}
            title={disabled ? 'รายชั่วโมงใช้ได้เฉพาะ "วันนี้"' : undefined}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              disabled
                ? 'cursor-not-allowed text-gray-300'
                : value === opt.value
                  ? 'cursor-pointer border border-gray-200 bg-white text-red-600 shadow-sm'
                  : 'cursor-pointer text-gray-500 hover:text-gray-700'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
});
