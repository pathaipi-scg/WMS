from ..constants import PLANT_NAME
from ..utils.date_ranges import get_date_range
from ..utils.db import fetch_all_dicts

# ตรงกับ _CAR_TYPE_LABEL ใน prediction.py
_TRUCK_TYPE_CASE = """
    CASE CarType
        WHEN 4            THEN N'4 ล้อ'
        WHEN 1000000008   THEN N'4 ล้อ'
        WHEN 6            THEN N'6 ล้อ'
        WHEN 1000000003   THEN N'6 ล้อ'
        WHEN 10           THEN N'10 ล้อ'
        WHEN 1000000000   THEN N'10 ล้อ'
        WHEN 1000000004   THEN N'10 ล้อ'
        WHEN 18           THEN N'เทรเลอร์'
        WHEN 22           THEN N'เทรเลอร์'
        WHEN 1000000001   THEN N'เทรเลอร์'
        WHEN 1000000002   THEN N'เทรเลอร์'
        WHEN 1000000005   THEN N'เทรเลอร์'
        WHEN 1000000006   THEN N'เทรเลอร์'
        WHEN 1000000007   THEN N'เทรเลอร์'
        WHEN 1000000009   THEN N'เทรเลอร์'
        ELSE              N'อื่นๆ'
    END
"""


def get_avg_time_by_truck_type_data(
    preset: str = 'today',
    group_by: str = 'day',
    date_from: str = None,
    date_to: str = None,
):
    start_dt, end_dt = get_date_range(preset, date_from, date_to)
    params = [PLANT_NAME, start_dt, end_dt]

    if group_by == 'hour':
        period_expr = "DATEPART(HOUR, OperatorCarConfirm)"
    else:
        period_expr = "CAST(OperatorCarConfirm AS DATE)"

    rows = fetch_all_dicts(f"""
        SELECT
            {period_expr} AS period_key,
            {_TRUCK_TYPE_CASE} AS truck_type,
            AVG(CAST(
                CASE
                    WHEN CarConfirm IS NOT NULL
                         AND DATEDIFF(MINUTE,
                             CAST(OperatorCarConfirm AS DATETIME),
                             CAST(CarConfirm AS DATETIME)) >= 0
                    THEN DATEDIFF(MINUTE,
                             CAST(OperatorCarConfirm AS DATETIME),
                             CAST(CarConfirm AS DATETIME))
                END AS FLOAT)) AS avg_wait,
            AVG(CAST(
                CASE
                    WHEN FirstPostPallet IS NOT NULL
                         AND LastPostPallet IS NOT NULL
                         AND DATEDIFF(MINUTE,
                             CAST(FirstPostPallet AS DATETIME),
                             CAST(LastPostPallet AS DATETIME)) >= 0
                    THEN DATEDIFF(MINUTE,
                             CAST(FirstPostPallet AS DATETIME),
                             CAST(LastPostPallet AS DATETIME))
                END AS FLOAT)) AS avg_load,
            AVG(CAST(
                CASE
                    WHEN PostingTime IS NOT NULL
                         AND DATEDIFF(MINUTE,
                             CAST(OperatorCarConfirm AS DATETIME),
                             CAST(PostingTime AS DATETIME)) >= 0
                    THEN DATEDIFF(MINUTE,
                             CAST(OperatorCarConfirm AS DATETIME),
                             CAST(PostingTime AS DATETIME))
                END AS FLOAT)) AS avg_total
        FROM [OBM_DWMS].[dbo].[vwTimeStampDashbaord]
        WHERE PlantName = %s
          AND OperatorCarConfirm >= %s
          AND OperatorCarConfirm <= %s
          AND OperatorCarConfirm IS NOT NULL
        GROUP BY
            {period_expr},
            {_TRUCK_TYPE_CASE}
        ORDER BY period_key, truck_type
    """, params)

    # Pivot: { period → { truck_type → {avg_wait, avg_load, avg_total} } }
    pivot: dict[str, dict] = {}
    for row in rows:
        if group_by == 'hour':
            pk = f"{int(row['period_key']):02d}:00"
        else:
            pk = str(row['period_key'])

        tt = row['truck_type']
        if pk not in pivot:
            pivot[pk] = {}

        pivot[pk][tt] = {
            "avg_wait":  round(row['avg_wait'],  1) if row['avg_wait']  is not None else None,
            "avg_load":  round(row['avg_load'],  1) if row['avg_load']  is not None else None,
            "avg_total": round(row['avg_total'], 1) if row['avg_total'] is not None else None,
        }

    data = [
        {"period": pk, **truck_vals}
        for pk, truck_vals in pivot.items()
    ]

    return {
        "preset":   preset,
        "group_by": group_by,
        "data":     data,
    }
