import { createContext, useContext } from 'react';
import { useRealtimeSnapshot } from './useRealtimeSnapshot';

const EMPTY = { snapshot: null, isLoading: false, error: null, connectionStatus: 'open', isToday: false };

/**
 * สร้าง { Provider, useRealtimeContext } สำหรับ realtime snapshot ของหนึ่ง feature
 * เพื่อไม่ต้องเขียน provider boilerplate ซ้ำในทุก feature
 *
 * @param {(props: object) => { socketUrl: string, event: string, fetchInitial: () => Promise<any>,
 *           enabled?: boolean, loadErrorMessage?: string, extra?: object }} getOptions
 *   แปลง props ของ Provider เป็น options ของ useRealtimeSnapshot — `extra` คือฟิลด์เสริม
 *   ที่อยากแนบเข้า context value (เช่น isToday)
 */
export function createRealtimeContext(getOptions) {
  const Context = createContext(EMPTY);

  function Provider({ children, ...props }) {
    const { extra, ...options } = getOptions(props);
    const realtime = useRealtimeSnapshot(options);
    return <Context.Provider value={{ ...realtime, ...extra }}>{children}</Context.Provider>;
  }

  function useRealtimeContext() {
    return useContext(Context);
  }

  return { Provider, useRealtimeContext };
}
