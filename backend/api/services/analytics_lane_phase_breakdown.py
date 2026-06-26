"""เวลาเฉลี่ยของ 5 ช่วงในวงจรรถ แยกตามลานจอด (PostLocationName) — สำหรับ stacked bar

ใช้ช่วงเวลาชุดเดียวกับ analytics_phase_distribution (PHASES + _duration_expr) แต่หา
ค่าเฉลี่ย (AVG) ต่อ "ลาน" แทนการกระจายเป็น box plot คืนค่าเป็นแท่งซ้อนหนึ่งแท่งต่อลาน
โดยแต่ละแท่งซ้อน 5 ช่วงเป็นเวลาเฉลี่ย (นาที)
"""

from ..constants import PLANT_NAME
from ..utils.date_ranges import get_date_range
from ..utils.db import fetch_all_dicts

from .analytics_phase_distribution import PHASES, _duration_expr


def get_lane_phase_breakdown_data(
    preset: str = 'today',
    date_from: str = None,
    date_to: str = None,
):
    start_dt, end_dt = get_date_range(preset, date_from, date_to)

    avg_selects = ",\n            ".join(
        f"AVG(CAST({_duration_expr(start_col, end_col)} AS FLOAT)) AS {key}"
        for key, start_col, end_col in PHASES
    )

    rows = fetch_all_dicts(f"""
        SELECT
            LTRIM(RTRIM(PostLocationName)) AS lane,
            COUNT(*) AS truck_count,
            {avg_selects}
        FROM [OBM_DWMS].[dbo].[vwTimeStampDashbaord]
        WHERE PlantName = %s
          AND OperatorCarConfirm >= %s
          AND OperatorCarConfirm <= %s
          AND OperatorCarConfirm IS NOT NULL
          AND PostLocationName IS NOT NULL
          AND LTRIM(RTRIM(PostLocationName)) <> ''
        GROUP BY LTRIM(RTRIM(PostLocationName))
        ORDER BY lane
    """, [PLANT_NAME, start_dt, end_dt])

    lanes = []
    for row in rows:
        entry = {"lane": row["lane"], "truck_count": int(row["truck_count"] or 0)}
        total = 0.0
        for key, _, _ in PHASES:
            value = row[key]
            rounded = round(float(value), 1) if value is not None else None
            entry[key] = rounded
            if rounded is not None:
                total += rounded
        entry["total"] = round(total, 1)
        lanes.append(entry)

    return {
        "preset": preset,
        "lanes": lanes,
    }
