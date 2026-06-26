"""รถเข้า/ออก แยกรายชั่วโมง (ของวัน) ตามประเภทรถ

รวมทุกวันในช่วงที่เลือกเข้าด้วยกันตาม "ชั่วโมงของวัน" (0–23):
- เข้า  = นับจาก OperatorCarConfirm (รถเข้าโรงงาน)
- ออก   = นับจาก PostingTime        (รถออก/ปิดงาน)

เช่น ถ้าเลือกดูทั้งเดือน → ชั่วโมง 07:00 จะรวมรถที่เข้า/ออกเวลา 7 โมงของทุกวันในเดือนนั้น
"""

from ..constants import PLANT_NAME
from ..utils.date_ranges import get_date_range
from ..utils.db import fetch_all_dicts
from ..utils.sql_fragments import TRUCK_TYPE_CASE

from .analytics_throughput_by_truck_type import TRUCK_TYPE_KEYS


def _pivot_by_hour(rows):
    """[{hour, truck_type, count}] → [{period:'HH:00', '<type>': count, ...}] เรียงตามชั่วโมง"""
    pivot: dict[int, dict] = {}
    for row in rows:
        hour = int(row['hour'])
        bucket = pivot.setdefault(hour, {key: 0 for key in TRUCK_TYPE_KEYS})
        bucket[row['truck_type']] = row['count']

    return [
        {"period": f"{hour:02d}:00", **vals}
        for hour, vals in sorted(pivot.items())
    ]


def _fetch_hourly(timestamp_col: str, params):
    return fetch_all_dicts(f"""
        SELECT
            DATEPART(HOUR, {timestamp_col}) AS hour,
            {TRUCK_TYPE_CASE} AS truck_type,
            COUNT(TruckSeqNo) AS count
        FROM [OBM_DWMS].[dbo].[vwTimeStampDashbaord]
        WHERE PlantName = %s
          AND {timestamp_col} >= %s
          AND {timestamp_col} <= %s
          AND {timestamp_col} IS NOT NULL
        GROUP BY DATEPART(HOUR, {timestamp_col}), {TRUCK_TYPE_CASE}
    """, params)


def get_hourly_breakdown_data(
    preset: str = 'today',
    date_from: str = None,
    date_to: str = None,
):
    start_dt, end_dt = get_date_range(preset, date_from, date_to)
    params = [PLANT_NAME, start_dt, end_dt]

    in_rows = _fetch_hourly("OperatorCarConfirm", params)
    out_rows = _fetch_hourly("PostingTime", params)

    return {
        "preset": preset,
        "in": _pivot_by_hour(in_rows),
        "out": _pivot_by_hour(out_rows),
    }
