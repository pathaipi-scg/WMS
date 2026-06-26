"""ข้อมูลรถที่ใช้เวลาเกินกำหนด (overtime > OVERTIME_THRESHOLD_MINUTES)

รวมข้อมูลที่เกี่ยวข้องทั้งหมดสำหรับหน้า "รถใช้เวลาเกิน":
- summary: จำนวน/อัตรา overtime, เวลารวมเฉลี่ย/สูงสุด, เกินกำหนดเฉลี่ย
- by_phase: เวลาเฉลี่ยแต่ละช่วง (5 ช่วง) ของรถ overtime เทียบกับรถปกติ → เห็นว่าเสียเวลาช่วงไหน
- by_truck_type: จำนวนรถ overtime แยกตามประเภทรถ
- trucks: รายการรถ overtime (โครงสร้างแถวเหมือน /truck_queues/ + totalMin) เรียงเวลามาก→น้อย
"""

from ..constants import OVERTIME_THRESHOLD_MINUTES, PLANT_NAME
from ..utils.date_ranges import get_date_range
from ..utils.db import fetch_all_dicts
from ..utils.sql_fragments import TRUCK_TYPE_CASE

from .analytics_phase_distribution import PHASES, _duration_expr
from .analytics_throughput_by_truck_type import TRUCK_TYPE_KEYS
from .truck_queues import TRUCK_QUEUE_COLUMNS

DEFAULT_OVERTIME_LIMIT = 200
MAX_OVERTIME_LIMIT = 1000

_TOTAL_MIN_EXPR = (
    "DATEDIFF(MINUTE, CAST(OperatorCarConfirm AS DATETIME), CAST(PostingTime AS DATETIME))"
)


def _avg(values):
    return round(sum(values) / len(values), 1) if values else None


def _clamp_limit(limit) -> int:
    try:
        value = int(limit)
    except (TypeError, ValueError):
        return DEFAULT_OVERTIME_LIMIT
    if value <= 0:
        return DEFAULT_OVERTIME_LIMIT
    return min(value, MAX_OVERTIME_LIMIT)


def get_overtime_data(
    preset: str = 'today',
    date_from: str = None,
    date_to: str = None,
    limit=DEFAULT_OVERTIME_LIMIT,
):
    start_dt, end_dt = get_date_range(preset, date_from, date_to)
    threshold = OVERTIME_THRESHOLD_MINUTES
    capped = _clamp_limit(limit)

    phase_selects = ",\n            ".join(
        f"{_duration_expr(start_col, end_col)} AS {key}"
        for key, start_col, end_col in PHASES
    )

    # Query A — ทุกคันที่เสร็จแล้ว (มี PostingTime) สำหรับสรุป/เปรียบเทียบ
    agg_rows = fetch_all_dicts(f"""
        SELECT
            {TRUCK_TYPE_CASE} AS truck_type,
            {_TOTAL_MIN_EXPR} AS total_min,
            {phase_selects}
        FROM [OBM_DWMS].[dbo].[vwTimeStampDashbaord]
        WHERE PlantName = %s
          AND OperatorCarConfirm >= %s
          AND OperatorCarConfirm <= %s
          AND OperatorCarConfirm IS NOT NULL
          AND PostingTime IS NOT NULL
          AND {_TOTAL_MIN_EXPR} >= 0
    """, [PLANT_NAME, start_dt, end_dt])

    overtime_rows = [r for r in agg_rows if r["total_min"] > threshold]
    ontime_rows = [r for r in agg_rows if r["total_min"] <= threshold]

    completed = len(agg_rows)
    overtime_count = len(overtime_rows)
    overtime_totals = [r["total_min"] for r in overtime_rows]

    summary = {
        "completed": completed,
        "overtime_count": overtime_count,
        "overtime_rate": round(overtime_count / completed * 100, 1) if completed else 0.0,
        "avg_total_min": _avg(overtime_totals),
        "max_total_min": max(overtime_totals) if overtime_totals else None,
        "avg_overshoot_min": _avg([t - threshold for t in overtime_totals]),
    }

    # by_phase — เวลาเฉลี่ยแต่ละช่วง overtime vs ปกติ
    by_phase = []
    for key, _, _ in PHASES:
        ot_vals = [float(r[key]) for r in overtime_rows if r[key] is not None]
        on_vals = [float(r[key]) for r in ontime_rows if r[key] is not None]
        by_phase.append({
            "phase": key,
            "overtime_avg": _avg(ot_vals),
            "ontime_avg": _avg(on_vals),
        })

    # by_truck_type — จำนวนรถ overtime แยกประเภท
    type_counts = {k: 0 for k in TRUCK_TYPE_KEYS}
    for r in overtime_rows:
        tt = r["truck_type"]
        if tt in type_counts:
            type_counts[tt] += 1
    by_truck_type = [{"truck_type": k, "count": type_counts[k]} for k in TRUCK_TYPE_KEYS]

    # Query B — รายการรถ overtime (คอลัมน์เต็มสำหรับตาราง + modal)
    trucks = fetch_all_dicts(f"""
        SELECT TOP (%s)
        {TRUCK_QUEUE_COLUMNS},
        {_TOTAL_MIN_EXPR} AS totalMin
        FROM [OBM_DWMS].[dbo].[vwTimeStampDashbaord] vtd
        WHERE PlantName = %s
          AND OperatorCarConfirm >= %s
          AND OperatorCarConfirm <= %s
          AND OperatorCarConfirm IS NOT NULL
          AND PostingTime IS NOT NULL
          AND {_TOTAL_MIN_EXPR} > {threshold}
        ORDER BY totalMin DESC;
    """, [capped, PLANT_NAME, start_dt, end_dt])

    return {
        "preset": preset,
        "threshold": threshold,
        "limit": capped,
        "summary": summary,
        "by_phase": by_phase,
        "by_truck_type": by_truck_type,
        "trucks": trucks,
    }
