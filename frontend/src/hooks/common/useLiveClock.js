import { useEffect, useState } from 'react';
// Hook สำหรับให้เวลาปัจจุบันที่อัปเดตทุกวินาที เพื่อแสดงเวลาแบบเรียลไทม์

export function useLiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return now;
}
