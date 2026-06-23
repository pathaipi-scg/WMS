// เก็บ token + โรงงานที่เลือกไว้แบบ module-level (sync) เพื่อให้ apiClient/websocket
// อ่านได้ทันทีโดยไม่ต้องส่งผ่าน argument ของทุกฟังก์ชัน — และ persist ลง localStorage
// ผู้ใช้ทั่วไปที่ไม่ได้ login จะไม่มี token/plant (backend จะ default เป็นโรงงานสาธารณะ)

const TOKEN_KEY = 'wms.auth.token';
const PLANT_KEY = 'wms.plant.code';

let token = localStorage.getItem(TOKEN_KEY) || null;
let plantCode = localStorage.getItem(PLANT_KEY) || null;

export function getToken() {
  return token;
}

export function setToken(value) {
  token = value || null;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getPlantCode() {
  return plantCode;
}

export function setPlantCode(value) {
  plantCode = value || null;
  if (plantCode) {
    localStorage.setItem(PLANT_KEY, plantCode);
  } else {
    localStorage.removeItem(PLANT_KEY);
  }
}
