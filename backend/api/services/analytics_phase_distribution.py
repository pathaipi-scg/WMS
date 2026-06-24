"""การกระจายเวลาของ 5 ช่วงในวงจรรถ แยกตามประเภทรถ — สำหรับ box plot แยกชนิดรถ

5 ช่วง (ระยะห่างของ timestamp ที่ติดกัน):
- wait_call  เวลารอเรียก   = CarConfirm − OperatorCarConfirm
- wait_load  เวลารอโหลด    = FirstPostPallet − CarConfirm
- load       เวลาโหลด      = LastPostPallet − FirstPostPallet
- wait_close เวลารอปิดงาน  = CheckerClose − LastPostPallet
- wait_post  เวลารอ post   = PostingTime − CheckerClose

คืนค่าสถิติ 5 จุด (min/Q1/median/Q3/max) ต่อ (ช่วงเวลา × ประเภทรถ) ของแต่ละ phase
"""

from collections import OrderedDict, defaultdict

from ..constants import PLANT_NAME
from ..utils.date_ranges import get_date_range
from ..utils.db import fetch_all_dicts
from ..utils.sql_fragments import TRUCK_TYPE_CASE

from .analytics_throughput_by_truck_type import TRUCK_TYPE_KEYS
from .analytics_time_distribution import _box_stats

# (key, ต้นช่วง, ปลายช่วง)
PHASES = [
    ("wait_call",  "OperatorCarConfirm", "CarConfirm"),
    ("wait_load",  "CarConfirm",         "FirstPostPallet"),
    ("load",       "FirstPostPallet",    "LastPostPallet"),
    ("wait_close", "LastPostPallet",     "CheckerClose"),
    ("wait_post",  "CheckerClose",       "PostingTime"),
]


def _duration_expr(start_col, end_col):
    diff = f"DATEDIFF(MINUTE, CAST({start_col} AS DATETIME), CAST({end_col} AS DATETIME))"
    return (
        f"CASE WHEN {start_col} IS NOT NULL AND {end_col} IS NOT NULL "
        f"AND {diff} >= 0 THEN {diff} END"
    )


def get_phase_distribution_data(
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
    duration_selects = ",\n            ".join(
        f"{_duration_expr(start_col, end_col)} AS {key}"
        for key, start_col, end_col in PHASES
    )

    rows = fetch_all_dicts(f"""
        SELECT
            {period_expr} AS period_key,
            {TRUCK_TYPE_CASE} AS truck_type,
            {duration_selects}
        FROM [OBM_DWMS].[dbo].[vwTimeStampDashbaord]
        WHERE PlantName = %s
          AND OperatorCarConfirm >= %s
          AND OperatorCarConfirm <= %s
          AND OperatorCarConfirm IS NOT NULL
        ORDER BY period_key
    """, [PLANT_NAME, start_dt, end_dt])

    # acc[phase][period][truck_type] = list ของค่า (นาที)
    period_order = OrderedDict()
    acc = {key: defaultdict(lambda: defaultdict(list)) for key, _, _ in PHASES}

    for row in rows:
        if group_by == 'hour':
            pk = f"{int(row['period_key']):02d}:00"
        else:
            pk = str(row['period_key'])
        period_order[pk] = True

        truck_type = row['truck_type']
        for key, _, _ in PHASES:
            value = row[key]
            if value is not None:
                acc[key][pk][truck_type].append(float(value))

    phases = {}
    for key, _, _ in PHASES:
        data = []
        for pk in period_order:
            entry = {"period": pk}
            for truck_type in TRUCK_TYPE_KEYS:
                values = acc[key][pk].get(truck_type)
                entry[truck_type] = _box_stats(values) if values else None
            data.append(entry)
        phases[key] = {"data": data}

    return {
        "preset": preset,
        "group_by": group_by,
        "phases": phases,
    }
