import { memo } from 'react';
// คอมโพเนนต์การ์ดสรุปข้อมูลที่ใช้ในหน้าแดชบอร์ด โดยมีธีมสีและไอคอนที่ปรับได้ตามประเภทของข้อมูล
const colorMap = {
  blue: 'text-blue-500',
  yellow: 'text-yellow-500',
  orange: 'text-orange-500',
  blue2: 'text-blue-800',
  green: 'text-green-500',
  green2: 'text-green-600',
  red: 'text-red-600',
};

export const SummaryCard = memo(function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  colorTheme = 'blue',
}) {
  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-bold text-gray-700">{title}</span>
        {icon && <span className={`${colorMap[colorTheme]}`}>{icon}</span>}
      </div>
      <div className={`mt-3 text-4xl font-bold tracking-tight ${colorMap[colorTheme]}`}>
        {value}
      </div>
      <div className="mt-2 text-[12px] font-medium text-gray-500">
        {subtitle}
      </div>
    </div>
  );
});
