import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { login as loginRequest, fetchMe, addPlant as addPlantRequest, removePlant as removePlantRequest } from '../../../services/authService';
import { getToken, setToken, getPlantCode, setPlantCode } from '../../../services/session';

// บริบทการยืนยันตัวตน:
// - ผู้ใช้ทั่วไป (ไม่ได้ login) → user = null, ดูได้เฉพาะโรงงานสาธารณะ (ไม่มี selector)
// - admin ส่วนกลาง → เลือกได้ทุกโรงงาน (มี dropdown)
// - ผู้ดูแลประจำโรงงาน → ถูกล็อกไว้ที่โรงงานตัวเอง
const AuthContext = createContext(null);

const ANON_STATE = { user: null, isAdmin: false, plants: [], selectedPlantCode: null };

export function AuthProvider({ children }) {
  // มี token ค้างอยู่ → ต้องตรวจสอบกับ backend ก่อน (loading); ไม่มี → เป็นผู้ใช้ทั่วไปทันที
  const [status, setStatus] = useState(() => (getToken() ? 'loading' : 'ready'));
  const [auth, setAuth] = useState(ANON_STATE);

  // นำข้อมูล session จาก backend มาตั้งค่า + เลือกโรงงาน (คงค่าที่เคยเลือกถ้ายังมีสิทธิ์)
  const applySession = useCallback((data) => {
    const plants = data.plants || [];
    const allowedCodes = plants.map((plant) => plant.code);
    const stored = getPlantCode();
    const selected = allowedCodes.includes(stored) ? stored : (data.default_plant_code || null);

    setPlantCode(selected);
    setAuth({
      user: data.user || null,
      isAdmin: !!data.is_admin,
      plants,
      selectedPlantCode: selected,
    });
  }, []);

  const resetToAnon = useCallback(() => {
    setToken(null);
    setPlantCode(null);
    setAuth(ANON_STATE);
  }, []);

  // ตรวจ token ที่ค้างอยู่ตอนเปิดแอป
  useEffect(() => {
    if (!getToken()) return;

    let active = true;
    (async () => {
      try {
        const data = await fetchMe();
        if (active) applySession(data);
      } catch {
        if (active) resetToAnon();
      } finally {
        if (active) setStatus('ready');
      }
    })();

    return () => {
      active = false;
    };
  }, [applySession, resetToAnon]);

  // token ถูก backend ปฏิเสธระหว่างใช้งาน (interceptor ยิง event นี้) → กลับเป็นผู้ใช้ทั่วไป
  useEffect(() => {
    const handler = () => resetToAnon();
    window.addEventListener('wms:unauthorized', handler);
    return () => window.removeEventListener('wms:unauthorized', handler);
  }, [resetToAnon]);

  const login = useCallback(async (username, password) => {
    const data = await loginRequest(username, password);
    setToken(data.token);
    applySession(data);
    setStatus('ready');
    return data;
  }, [applySession]);

  const logout = useCallback(() => {
    resetToAnon();
  }, [resetToAnon]);

  // เพิ่มโรงงาน (เฉพาะ admin) แล้วอัปเดตรายชื่อโรงงานในบริบททันที
  const addPlant = useCallback(async (code, name) => {
    const data = await addPlantRequest(code, name);
    setAuth((prev) => ({ ...prev, plants: data.plants || prev.plants }));
    return data;
  }, []);

  // ลบโรงงานที่เพิ่มผ่าน UI (เฉพาะ admin) — ถ้าลบตัวที่กำลังดูอยู่ ให้สลับไปโรงงานเริ่มต้น
  const removePlant = useCallback(async (code) => {
    const data = await removePlantRequest(code);
    setAuth((prev) => {
      const plants = data.plants || prev.plants.filter((plant) => plant.code !== code);
      let selectedPlantCode = prev.selectedPlantCode;
      if (!plants.some((plant) => plant.code === selectedPlantCode)) {
        selectedPlantCode = data.default_plant_code || plants[0]?.code || null;
        setPlantCode(selectedPlantCode);
      }
      return { ...prev, plants, selectedPlantCode };
    });
    return data;
  }, []);

  // เปลี่ยนโรงงานที่ดู (เฉพาะที่มีสิทธิ์) — อัปเดต session holder ก่อนเพื่อให้ refetch ใช้ค่าใหม่
  const setSelectedPlant = useCallback((code) => {
    setAuth((prev) => {
      if (!prev.plants.some((plant) => plant.code === code)) return prev;
      setPlantCode(code);
      return { ...prev, selectedPlantCode: code };
    });
  }, []);

  const selectedPlant = useMemo(
    () => auth.plants.find((plant) => plant.code === auth.selectedPlantCode) || null,
    [auth.plants, auth.selectedPlantCode],
  );

  const value = useMemo(
    () => ({ status, ...auth, selectedPlant, login, logout, setSelectedPlant, addPlant, removePlant }),
    [status, auth, selectedPlant, login, logout, setSelectedPlant, addPlant, removePlant],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth ต้องใช้ภายใน <AuthProvider>');
  }
  return context;
}
