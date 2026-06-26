"""การกระจายของ "เวลารวม" (PostingTime − OperatorCarConfirm) ต่อช่วงเวลา — สำหรับ box plot

คืนค่าสถิติ 5 จุด (min / Q1 / median / Q3 / max) ของเวลารวมต่อรถ จัดกลุ่มตามวันหรือชั่วโมง
ไม่แยกตามประเภทรถ — ใช้รถทุกคันรวมกันในแต่ละช่วงเวลา
"""

import statistics

from ..constants import PLANT_NAME
from ..utils.date_ranges import get_date_range
from ..utils.db import fetch_all_dicts


def _box_stats(values):
    values = sorted(values)
    n = len(values)
    if n == 0:
        return None

    if n >= 2:
        q1, median, q3 = statistics.quantiles(values, n=4, method='inclusive')
    else:
        q1 = median = q3 = float(values[0])

    return {
        "min":    round(values[0], 1),
        "q1":     round(q1, 1),
        "median": round(median, 1),
        "q3":     round(q3, 1),
        "max":    round(values[-1], 1),
        "count":  n,
    }


def get_time_distribution_data(
    preset: str = 'today',
    group_by: str = 'day',
    date_from: str = None,
    date_to: str = None,
):
    start_dt, end_dt = get_date_range(preset, date_from, date_to)

    period_expr = (
        "DATEPART(HOUR, OperatorCarConfirm)" if group_by == 'hour'
        else "CAST(OperatorCarConfirm AS DATE)"
    )

    rows = fetch_all_dicts(f"""
        SELECT
            {period_expr} AS period_key,
            DATEDIFF(MINUTE,
                CAST(OperatorCarConfirm AS DATETIME),
                CAST(PostingTime AS DATETIME)) AS total_min
        FROM [OBM_DWMS].[dbo].[vwTimeStampDashbaord]
        WHERE PlantName = %s
          AND OperatorCarConfirm >= %s
          AND OperatorCarConfirm <= %s
          AND OperatorCarConfirm IS NOT NULL
          AND PostingTime IS NOT NULL
          AND DATEDIFF(MINUTE,
                CAST(OperatorCarConfirm AS DATETIME),
                CAST(PostingTime AS DATETIME)) >= 0
        ORDER BY period_key
    """, [PLANT_NAME, start_dt, end_dt])

    # จัดกลุ่มค่าเวลารวมตามช่วงเวลา (insertion order = เรียงตาม period_key อยู่แล้ว)
    grouped: dict[str, list] = {}
    for row in rows:
        if row['total_min'] is None:
            continue
        if group_by == 'hour':
            pk = f"{int(row['period_key']):02d}:00"
        else:
            pk = str(row['period_key'])
        grouped.setdefault(pk, []).append(float(row['total_min']))

    data = []
    for pk, values in grouped.items():
        stats = _box_stats(values)
        if stats:
            data.append({"period": pk, **stats})

    return {
        "preset": preset,
        "group_by": group_by,
        "data": data,
    }
