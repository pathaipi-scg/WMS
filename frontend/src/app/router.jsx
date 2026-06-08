import { DashboardPage } from '../pages/DashboardPage';
import { PredictionPage } from '../pages/PredictionPage';
import { AnalyticsPage } from '../pages/AnalyticsPage';

export function AppRouter({ activePage, onNavigate }) {
  if (activePage === 'predictions') {
    return <PredictionPage onNavigate={onNavigate} />;
  }
  if (activePage === 'analytics') {
    return <AnalyticsPage onNavigate={onNavigate} />;
  }
  return <DashboardPage onNavigate={onNavigate} />;
}
