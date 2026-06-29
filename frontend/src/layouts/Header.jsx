import { memo } from 'react';
import { NavLink } from 'react-router-dom';
import { AlertTriangle, BarChart2, ChartBar, LayoutDashboard } from 'lucide-react';
import { DEFAULT_PLANT_NAME } from '../shared/constants/app';
import { NotificationMenu } from '../features/notifications';
import { PlantSelector, AddPlantButton, UserMenu } from '../features/auth';
import { useLiveClock } from '../shared/hooks/useLiveClock';
import { formatThaiDateTime } from '../shared/utils/dateTime';

const NAV_TABS = [
  { to: '/',            label: 'ภาพรวม',         Icon: LayoutDashboard },
  { to: '/predictions', label: 'รายงานผลโมเดล',  Icon: ChartBar },
  { to: '/analytics',   label: 'วิเคราะห์ข้อมูล', Icon: BarChart2 },
  { to: '/overtime',    label: 'รถใช้เวลาเกิน',  Icon: AlertTriangle },
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
          <PlantSelector plantName={plantName} />
          <AddPlantButton />

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
          <UserMenu />
        </div>
      </div>
    </header>
  );
});
