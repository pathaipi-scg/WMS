const COLOR_CLASSES = {
  blue: 'border border-gray-200 bg-white p-4 shadow-sm text-blue-700',
  green: 'border border-gray-200 bg-white p-4 shadow-sm text-green-700',
  red: 'border border-gray-200 bg-white p-4 shadow-sm text-red-600',
  gray: 'border border-gray-200 bg-white p-4 shadow-sm text-gray-700',
};

export function MetricCard({ label, value, unit, icon: Icon, color = 'blue', subtitle }) {
  return (
    <div className={`flex flex-col gap-1 rounded-xl border px-5 py-4 ${COLOR_CLASSES[color]}`}>
      <div className="flex items-center gap-2 text-md font-semibold opacity-80">
        <Icon className="h-5 w-5" />
        {label}
      </div>
      <div className="text-2xl font-bold mt-2">
        {value !== null && value !== undefined ? (
          <>
            {value}
            {unit && <span className="ml-2 text-md opacity-80 font-normal">{unit}</span>}
          </>
        ) : (
          <span className="text-base font-normal">ยังไม่มีข้อมูล</span>
        )}
      </div>
      {subtitle && <div className="text-sm mt-2 opacity-80 font-medium">{subtitle}</div>}
    </div>
  );
}
