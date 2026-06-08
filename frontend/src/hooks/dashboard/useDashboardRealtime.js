import { useEffect, useState } from 'react';
import useWebSocket from 'react-use-websocket';
import { DASHBOARD_LOAD_ERROR, DASHBOARD_SNAPSHOT_EVENT,} from '../../constants/dashboard';
import { getDashboardSnapshot, getDashboardSocketUrl } from '../../services/dashboardService';
// Hook สำหรับเชื่อมต่อกับ WebSocket ของแดชบอร์ดเพื่อรับข้อมูลแบบเรียลไทม์ และจัดการสถานะการโหลดและข้อผิดพลาดในการดึงข้อมูล

export function useDashboardRealtime() {
  const [snapshot, setSnapshot] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const { lastJsonMessage } = useWebSocket(getDashboardSocketUrl(), {
    share: true,
    shouldReconnect: () => true,
    retryOnError: true,
  });

  useEffect(() => {
    let isMounted = true;

    const loadSnapshot = async () => {
      try {
        const nextSnapshot = await getDashboardSnapshot();

        if (!isMounted) {
          return;
        }

        setSnapshot(nextSnapshot);
        setError(null);
      } catch (loadError) {
        console.error('Failed to fetch dashboard snapshot', loadError);

        if (!isMounted) {
          return;
        }

        setError(DASHBOARD_LOAD_ERROR);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadSnapshot();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (lastJsonMessage?.event !== DASHBOARD_SNAPSHOT_EVENT) {
      return;
    }

    setSnapshot(lastJsonMessage.payload);
    setError(null);
    setIsLoading(false);
  }, [lastJsonMessage]);

  return {
    snapshot,
    isLoading,
    error,
  };
}
