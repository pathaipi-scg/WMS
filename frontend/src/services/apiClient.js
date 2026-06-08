import axios from 'axios';

import { API_ORIGIN } from '../config/env';
// สร้างอินสแตนซ์ของ axios ที่ตั้งค่า baseURL เป็น API_ORIGIN ตามที่กำหนดในไฟล์ env.js เพื่อใช้ในการเรียก API ในแอปพลิเคชัน
export const apiClient = axios.create({
  baseURL: `${API_ORIGIN}/api`,
});
