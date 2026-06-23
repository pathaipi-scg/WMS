import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardPage } from '../pages/DashboardPage';
import { PredictionPage } from '../pages/PredictionPage';
import { AnalyticsPage } from '../pages/AnalyticsPage';
import { LoginPage, useAuth } from '../features/auth';
import { PageLoadingState } from '../shared/components/feedback/PageLoadingState';

// กำหนดเส้นทาง (route) ของแอป โดยใช้ react-router-dom ให้แต่ละหน้ามี URL ของตัวเอง
// ผู้ใช้ทั่วไปเข้าได้ทุกหน้าโดยไม่ต้อง login — admin ใช้ /login เพื่อสลับโรงงาน
export function AppRouter() {
  const { status, selectedPlantCode } = useAuth();

  // ระหว่างตรวจ token ที่ค้างอยู่ (เฉพาะกรณีมี token) แสดงหน้าโหลดก่อน
  if (status === 'loading') {
    return <PageLoadingState />;
  }

  // key ด้วยโรงงานที่เลือก → เปลี่ยนโรงงานแล้ว remount เพื่อ refetch ข้อมูลใหม่ทั้งหน้า
  const plantKey = selectedPlantCode || 'public';

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<DashboardPage key={plantKey} />} />
      <Route path="/predictions" element={<PredictionPage key={plantKey} />} />
      <Route path="/analytics" element={<AnalyticsPage key={plantKey} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
