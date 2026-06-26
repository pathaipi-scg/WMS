"""ปริมาณรถเข้าตามช่วงเวลา แยกตามประเภทรถ (4 ล้อ / 6 ล้อ / 10 ล้อ / เทรเลอร์ / อื่นๆ)

โครงเดียวกับ analytics_throughput แต่ pivot เพิ่มมิติ "ประเภทรถ" เพื่อวาดเป็นกราฟเส้นหลายเส้น
"""

from ..constants import PLANT_NAME
from ..utils.date_ranges import get_date_range
from ..utils.db import fetch_all_dicts
from ..utils.sql_fragments import TRUCK_TYPE_CASE

# ลำดับ/รายการประเภทรถ — ใช้เติม 0 ให้ครบทุกช่วงเวลา (sync กับ TRUCK_TYPE_CASE)
TRUCK_TYPE_KEYS = ['4 ล้อ', '6 ล้อ', '10 ล้อ', 'เทรเลอร์', 'อื่นๆ']


def get_throughput_by_truck_type_data(
    preset: str = 'today',
    group_by: str = 'day',
    date_from: str = None,
    date_to: str = None,
):
    start_dt, end_dt = get_date_range(preset, date_from, date_to)
    params = [PLANT_NAME, start_dt, end_dt]

    period_expr = (
        "DATEPART(HOUR, OperatorCarConfirm)" if group_by == 'hour'
        else "CAST(OperatorCarConfirm AS DATE)"
    )

    rows = fetch_all_dicts(f"""
        SELECT
            {period_expr} AS period_key,
            {TRUCK_TYPE_CASE} AS truck_type,
            COUNT(TruckSeqNo) AS count
        FROM [OBM_DWMS].[dbo].[vwTimeStampDashbaord]
        WHERE PlantName = %s
          AND OperatorCarConfirm >= %s
          AND OperatorCarConfirm <= %s
          AND OperatorCarConfirm IS NOT NULL
        GROUP BY {period_expr}, {TRUCK_TYPE_CASE}
        ORDER BY period_key
    """, params)

    # Pivot: { period → { truck_type → count } } (เติม 0 ให้ครบทุกประเภท)
    pivot: dict[str, dict] = {}
    for row in rows:
        if group_by == 'hour':
            pk = f"{int(row['period_key']):02d}:00"
        else:
            pk = str(row['period_key'])

        bucket = pivot.setdefault(pk, {key: 0 for key in TRUCK_TYPE_KEYS})
        bucket[row['truck_type']] = row['count']

    data = [{"period": pk, **vals} for pk, vals in pivot.items()]

    return {
        "preset": preset,
        "group_by": group_by,
        "data": data,
    }
