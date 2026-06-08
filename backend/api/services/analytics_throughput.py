from ..constants import PLANT_NAME
from ..utils.date_ranges import get_date_range
from ..utils.db import fetch_all_dicts


def get_throughput_data(preset: str = 'today', group_by: str = 'day', date_from: str = None, date_to: str = None):
    start_dt, end_dt = get_date_range(preset, date_from, date_to)
    params = [PLANT_NAME, start_dt, end_dt]

    if group_by == 'hour':
        rows = fetch_all_dicts("""
            SELECT
                DATEPART(HOUR, OperatorCarConfirm) AS period_num,
                COUNT(TruckSeqNo) AS count
            FROM [OBM_DWMS].[dbo].[vwTimeStampDashbaord]
            WHERE PlantName = %s
              AND OperatorCarConfirm >= %s
              AND OperatorCarConfirm <= %s
              AND OperatorCarConfirm IS NOT NULL
            GROUP BY DATEPART(HOUR, OperatorCarConfirm)
            ORDER BY period_num ASC
        """, params)

        data = [
            {"period": f"{row['period_num']:02d}:00", "count": row['count']}
            for row in rows
        ]
    else:
        rows = fetch_all_dicts("""
            SELECT
                CAST(OperatorCarConfirm AS DATE) AS period_date,
                COUNT(TruckSeqNo) AS count
            FROM [OBM_DWMS].[dbo].[vwTimeStampDashbaord]
            WHERE PlantName = %s
              AND OperatorCarConfirm >= %s
              AND OperatorCarConfirm <= %s
              AND OperatorCarConfirm IS NOT NULL
            GROUP BY CAST(OperatorCarConfirm AS DATE)
            ORDER BY period_date ASC
        """, params)

        data = [
            {"period": str(row['period_date']), "count": row['count']}
            for row in rows
        ]

    return {
        "preset": preset,
        "group_by": group_by,
        "data": data,
    }
