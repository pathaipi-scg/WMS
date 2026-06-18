import { useEffect, useState } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';

// แปลง readyState ของ socket เป็นสถานะที่ UI ใช้สื่อสารกับผู้ใช้
function toConnectionStatus(readyState) {
  if (readyState === ReadyState.OPEN) return 'open';
  if (readyState === ReadyState.CONNECTING) return 'connecting';
  // CLOSING / CLOSED / UNINSTANTIATED — เนื่องจาก shouldReconnect = true จึงถือว่ากำลังต่อใหม่
  return 'reconnecting';
}

/**
 * Hook กลางสำหรับรับ "snapshot" แบบเรียลไทม์ผ่าน WebSocket
 * - โหลดข้อมูลครั้งแรกผ่าน REST (fetchInitial) แล้วอัปเดตต่อจาก event ของ WS
 * - ปิดการเชื่อมต่อได้ด้วย enabled=false (เช่น หน้าที่ดูข้อมูลย้อนหลังซึ่งไม่ต้องการ realtime)
 *
 * @param {{ socketUrl: string, event: string, fetchInitial: () => Promise<any>,
 *           enabled?: boolean, loadErrorMessage?: string }} options
 * @returns {{ snapshot: any, isLoading: boolean, error: string|null, connectionStatus: string }}
 */
export function useRealtimeSnapshot({ socketUrl, event, fetchInitial, enabled = true, loadErrorMessage }) {
  const [snapshot, setSnapshot] = useState(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const { lastJsonMessage, readyState } = useWebSocket(
    enabled ? socketUrl : null,
    { share: true, shouldReconnect: () => true, retryOnError: true },
    enabled,
  );

  // โหลด snapshot แรกผ่าน REST — รันใหม่เมื่อ enabled/socketUrl เปลี่ยน
  useEffect(() => {
    if (!enabled) {
      setSnapshot(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    (async () => {
      try {
        const next = await fetchInitial();
        if (!isMounted) return;
        setSnapshot(next);
        setError(null);
      } catch (loadError) {
        console.error('Failed to fetch realtime snapshot', loadError);
        if (!isMounted) return;
        setError(loadErrorMessage ?? 'ไม่สามารถโหลดข้อมูลได้');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, socketUrl]);

  // อัปเดต snapshot จาก event ของ WebSocket
  useEffect(() => {
    if (!enabled || lastJsonMessage?.event !== event) return;
    setSnapshot(lastJsonMessage.payload);
    setError(null);
    setIsLoading(false);
  }, [enabled, event, lastJsonMessage]);

  return {
    snapshot,
    isLoading,
    error,
    connectionStatus: toConnectionStatus(readyState),
  };
}
