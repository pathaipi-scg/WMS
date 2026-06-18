import { useEffect, useMemo, useState } from 'react';
import { getPredictionModels } from '../../../services/predictionService';

// ดึงรายชื่อโมเดลที่เคยทำนาย (Model + Version) มาทำเป็นตัวเลือก dropdown
// `n` = จำนวนแถวของโมเดลนั้นในช่วงวันที่ที่เลือก → 0 = ไม่ได้ใช้ในช่วงนี้ (disabled)
// `lastUsed` = วันสุดท้ายที่โมเดลนั้นถูกใช้ (YYYY-MM-DD)
// โมเดลแรก (เวอร์ชันสูงสุด) = ตัวล่าสุดที่ใช้งานอยู่
export function usePredictionModels(preset = 'today', dateFrom = '', dateTo = '') {
  const [models, setModels] = useState([]);

  useEffect(() => {
    let alive = true;
    getPredictionModels(preset, dateFrom, dateTo)
      .then((res) => { if (alive) setModels(res?.models ?? []); })
      .catch(() => { if (alive) setModels([]); });
    return () => { alive = false; };
  }, [preset, dateFrom, dateTo]);

  const options = useMemo(() => models.map((m, idx) => ({
    value: `${m.model}__${m.version ?? ''}`,
    label: m.version != null ? `${m.model} (v${m.version})` : m.model,
    model: { model: m.model, version: m.version },
    isLatest: idx === 0,        // เวอร์ชันสูงสุด = โมเดลล่าสุด
    lastUsed: m.lastUsed,
    disabled: !m.n,             // ไม่มีข้อมูลในช่วงนี้ → เลือกไม่ได้
  })), [models]);

  return { options };
}
