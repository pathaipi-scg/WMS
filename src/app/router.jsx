import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardPage } from '../pages/DashboardPage';
import { PredictionPage } from '../pages/PredictionPage';
import { AnalyticsPage } from '../pages/AnalyticsPage';

// กำหนดเส้นทาง (route) ของแอป โดยใช้ react-router-dom ให้แต่ละหน้ามี URL ของตัวเอง
export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/predictions" element={<PredictionPage />} />
      <Route path="/analytics" element={<AnalyticsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
