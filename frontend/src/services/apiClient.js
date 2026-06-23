import axios from 'axios';

import { API_ORIGIN } from '../config/env';
import { getToken, getPlantCode, setToken } from './session';
// สร้างอินสแตนซ์ของ axios ที่ตั้งค่า baseURL เป็น API_ORIGIN ตามที่กำหนดในไฟล์ env.js เพื่อใช้ในการเรียก API ในแอปพลิเคชัน
export const apiClient = axios.create({
  baseURL: `${API_ORIGIN}/api`,
});

// แนบ token (ถ้ามี) + plant_code ที่เลือกไว้ให้ทุก request โดยอัตโนมัติ
// - ผู้ใช้ทั่วไป (ไม่มี token/plant) → backend จะ default เป็นโรงงานสาธารณะ
// - ไม่แนบ plant_code ให้ endpoint กลุ่ม /auth/ (ไม่เกี่ยวกับโรงงาน)
apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const isAuthEndpoint = (config.url || '').startsWith('/auth/');
  if (config.method === 'get' && !isAuthEndpoint) {
    const plantCode = getPlantCode();
    if (plantCode) {
      config.params = { plant_code: plantCode, ...(config.params || {}) };
    }
  }

  return config;
});

// token หมดอายุ/ไม่ถูกต้อง → ล้าง token แล้วแจ้งให้ AuthProvider กลับเป็นผู้ใช้ทั่วไป
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && getToken()) {
      setToken(null);
      window.dispatchEvent(new CustomEvent('wms:unauthorized'));
    }
    return Promise.reject(error);
  },
);
