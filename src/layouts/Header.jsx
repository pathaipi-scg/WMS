import { memo } from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart2, ChartBar, LayoutDashboard, MapPin, User } from 'lucide-react';
import { DEFAULT_PLANT_NAME } from '../shared/constants/app';
import { NotificationMenu } from '../features/notifications';
import { useLiveClock } from '../shared/hooks/useLiveClock';
import { formatThaiDateTime } from '../shared/utils/dateTime';

const NAV_TABS = [
  { to: '/',            label: 'ภาพรวม',         Icon: LayoutDashboard },
  { to: '/predictions', label: 'รายงานผลโมเดล',  Icon: ChartBar },
  { to: '/analytics',   label: 'วิเคราะห์ข้อมูล', Icon: BarChart2 },
];

export const Header = memo(function Header({
  plantName = DEFAULT_PLANT_NAME,
  truckQueues = [],
  showNotifications = true,
}) {
  const now = useLiveClock();
  const dateTimeLabel = formatThaiDateTime(now);

  return (
    <header className="border-b border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <h1 className="text-3xl font-bold tracking-tight text-red-600">WMS</h1>
          <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-1.5 text-sm cursor-pointer">
            <MapPin className="h-4 w-4 text-red-500" />
            <span className="font-medium text-gray-700">{plantName}</span>
          </div>

          <nav className="flex items-center gap-1">
            {NAV_TABS.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-lg px-3 py-1.5 cursor-pointer text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-red-50 text-red-600'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-6 text-sm text-gray-600">
          <span className="hidden md:inline-block font-semibold">{dateTimeLabel}</span>
          {showNotifications && <NotificationMenu truckQueues={truckQueues} />}
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white shadow-sm transition-colors hover:bg-red-600 cursor-pointer">
            <User className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
});
