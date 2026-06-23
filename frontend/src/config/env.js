// ค่าเริ่มต้น: ชี้ backend ไปที่ "host เดียวกับที่เปิดหน้าเว็บ" บนพอร์ต 3004
// เปิด localhost:3000 → API = localhost:3004, เปิดผ่าน IP เครื่อง → API = IP เดียวกัน:3004
// (กำหนด VITE_API_ORIGIN ใน .env ของ frontend เพื่อ override ได้)
// python -m daphne -b 0.0.0.0 -p 3004 backend.asgi:application
const DEFAULT_API_ORIGIN =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:3004`
    : 'http://127.0.0.1:3004';

export const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN || DEFAULT_API_ORIGIN).replace(/\/$/, '');
export const WS_ORIGIN = (import.meta.env.VITE_WS_ORIGIN || API_ORIGIN).replace(/\/$/, '');
