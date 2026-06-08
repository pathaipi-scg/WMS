from ..constants import PLANT_NAME
from ..utils.date_ranges import get_date_range
from ..utils.db import fetch_all_dicts


def get_queue_distribution_data(preset: str = 'today', date_from: str = None, date_to: str = None):
    start_dt, end_dt = get_date_range(preset, date_from, date_to)
    params = [PLANT_NAME, start_dt, end_dt]

    rows = fetch_all_dicts("""
        SELECT queue_type, COUNT(*) AS count
        FROM (
            SELECT
                CASE
                    WHEN LTRIM(RTRIM(PickListType)) = 'SmartQ' THEN 'SmartQ'
                    WHEN LTRIM(RTRIM(PickListType)) = 'Walk-in'
                         AND ISNULL(PrepareForward, 'N') = 'N' THEN 'Walk in'
                    WHEN LTRIM(RTRIM(PickListType)) = 'Walk-in'
                         AND PrepareForward = 'Y' THEN N'ล่วงหน้า'
                    ELSE N'อื่นๆ'
                END AS queue_type
            FROM [OBM_DWMS].[dbo].[vwTimeStampDashbaord]
            WHERE PlantName = %s
              AND OperatorCarConfirm >= %s
              AND OperatorCarConfirm <= %s
              AND OperatorCarConfirm IS NOT NULL
        ) sub
        GROUP BY queue_type
        ORDER BY count DESC
    """, params)

    total = sum(r['count'] for r in rows)
    data = [
        {
            "queue_type": row['queue_type'],
            "count": row['count'],
            "pct": round(row['count'] / total * 100, 1) if total else 0.0,
        }
        for row in rows
    ]

    return {
        "preset": preset,
        "total": total,
        "data": data,
    }
