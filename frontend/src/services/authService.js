import { apiClient } from './apiClient';

// เข้าสู่ระบบ — คืน { token, user, is_admin, plants, default_plant_code }
export async function login(username, password) {
  const response = await apiClient.post('/auth/login/', { username, password });
  return response.data;
}

// ตรวจ token ปัจจุบัน (อ่านจาก session ผ่าน interceptor) — คืนข้อมูล session เดิม
export async function fetchMe() {
  const response = await apiClient.get('/auth/me/');
  return response.data;
}

// เพิ่มโรงงาน (เฉพาะ admin) — คืน { plants, default_plant_code, is_admin }
export async function addPlant(code, name) {
  const response = await apiClient.post('/auth/plants/', { code, name });
  return response.data;
}

// ลบโรงงานที่เพิ่มผ่าน UI (เฉพาะ admin) — คืน { plants, default_plant_code, is_admin }
export async function removePlant(code) {
  const response = await apiClient.delete(`/auth/plants/${encodeURIComponent(code)}/`);
  return response.data;
}
