import { createRealtimeContext } from '../../../shared/hooks/createRealtimeContext';
import { getPredictionsSnapshot, getPredictionsSocketUrl } from '../../../services/predictionService';
import { PREDICTIONS_SNAPSHOT_EVENT } from '../constants';

// Provider เปิด WebSocket เส้นเดียวสำหรับ snapshot "วันนี้" ของ Predictions แล้วแชร์ให้
// ทุก data hook ในหน้า — เปิดเฉพาะตอน preset === 'today' (ช่วงย้อนหลังใช้ REST)
const { Provider, useRealtimeContext } = createRealtimeContext(({ preset }) => {
  const isToday = preset === 'today';
  return {
    socketUrl: getPredictionsSocketUrl(),
    event: PREDICTIONS_SNAPSHOT_EVENT,
    fetchInitial: getPredictionsSnapshot,
    enabled: isToday,
    loadErrorMessage: 'ไม่สามารถดึงข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
    extra: { isToday },
  };
});

export const PredictionRealtimeProvider = Provider;
export const usePredictionRealtimeContext = useRealtimeContext;
