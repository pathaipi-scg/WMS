"""ประวัติรถย้อนหลัง — รายการรถ N คันล่าสุดในช่วงเวลาที่เลือก (รวมทุกสถานะ)

ใช้ชุดคอลัมน์เดียวกับหน้าแรก (TRUCK_QUEUE_COLUMNS) เพื่อให้ตาราง + modal รายละเอียด
ทำงานได้เหมือนกัน ต่างกันแค่: ไม่กรองเฉพาะรถที่ยัง active, กรองด้วยช่วงวันที่ของหน้า
วิเคราะห์, และจำกัดจำนวน (default 100 คันล่าสุด)
"""

from ..constants import PLANT_NAME
from ..utils.date_ranges import get_date_range
from ..utils.db import fetch_all_dicts
from ..utils.sql_fragments import EFFECTIVE_DATE_CASE

from .truck_queues import TRUCK_QUEUE_COLUMNS

DEFAULT_HISTORY_LIMIT = 100
MAX_HISTORY_LIMIT = 500

_HISTORY_SQL = f"""
    SELECT TOP (%s)
    {TRUCK_QUEUE_COLUMNS}
    FROM [OBM_DWMS].[dbo].[vwTimeStampDashbaord] vtd
    WHERE PlantName = %s
    AND ({EFFECTIVE_DATE_CASE}) >= %s
    AND ({EFFECTIVE_DATE_CASE}) <= %s
    ORDER BY ({EFFECTIVE_DATE_CASE}) DESC, TruckSeqNo DESC;
"""


def _clamp_limit(limit) -> int:
    try:
        value = int(limit)
    except (TypeError, ValueError):
        return DEFAULT_HISTORY_LIMIT
    if value <= 0:
        return DEFAULT_HISTORY_LIMIT
    return min(value, MAX_HISTORY_LIMIT)


def get_truck_history_data(
    preset: str = 'today',
    date_from: str = None,
    date_to: str = None,
    limit=DEFAULT_HISTORY_LIMIT,
):
    start_dt, end_dt = get_date_range(preset, date_from, date_to)
    capped = _clamp_limit(limit)
    trucks = fetch_all_dicts(_HISTORY_SQL, [capped, PLANT_NAME, start_dt, end_dt])

    return {
        "preset": preset,
        "limit": capped,
        "count": len(trucks),
        "trucks": trucks,
    }
