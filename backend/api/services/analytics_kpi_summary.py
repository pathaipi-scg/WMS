from ..constants import OVERTIME_THRESHOLD_MINUTES, PLANT_NAME
from ..utils.date_ranges import get_date_range, get_prev_date_range
from ..utils.db import fetch_scalar


def _kpi_data(start_dt, end_dt):
    params = [PLANT_NAME, start_dt, end_dt]

    total_trucks = fetch_scalar("""
        SELECT COUNT(TruckSeqNo)
        FROM [OBM_DWMS].[dbo].[vwTimeStampDashbaord]
        WHERE PlantName = %s
          AND OperatorCarConfirm >= %s
          AND OperatorCarConfirm <= %s
    """, params)

    avg_wait_min = fetch_scalar("""
        SELECT AVG(CAST(DATEDIFF(MINUTE,
            CAST(OperatorCarConfirm AS DATETIME),
            CAST(CarConfirm AS DATETIME)) AS FLOAT))
        FROM [OBM_DWMS].[dbo].[vwTimeStampDashbaord]
        WHERE PlantName = %s
          AND OperatorCarConfirm >= %s
          AND OperatorCarConfirm <= %s
          AND OperatorCarConfirm IS NOT NULL
          AND CarConfirm IS NOT NULL
          AND DATEDIFF(MINUTE, CAST(OperatorCarConfirm AS DATETIME), CAST(CarConfirm AS DATETIME)) >= 0
    """, params, default=None)

    avg_load_min = fetch_scalar("""
        SELECT AVG(CAST(DATEDIFF(MINUTE,
            CAST(FirstPostPallet AS DATETIME),
            CAST(LastPostPallet AS DATETIME)) AS FLOAT))
        FROM [OBM_DWMS].[dbo].[vwTimeStampDashbaord]
        WHERE PlantName = %s
          AND OperatorCarConfirm >= %s
          AND OperatorCarConfirm <= %s
          AND FirstPostPallet IS NOT NULL
          AND LastPostPallet IS NOT NULL
          AND DATEDIFF(MINUTE, CAST(FirstPostPallet AS DATETIME), CAST(LastPostPallet AS DATETIME)) >= 0
    """, params, default=None)

    avg_total_min = fetch_scalar("""
        SELECT AVG(CAST(DATEDIFF(MINUTE,
            CAST(OperatorCarConfirm AS DATETIME),
            CAST(PostingTime AS DATETIME)) AS FLOAT))
        FROM [OBM_DWMS].[dbo].[vwTimeStampDashbaord]
        WHERE PlantName = %s
          AND OperatorCarConfirm >= %s
          AND OperatorCarConfirm <= %s
          AND OperatorCarConfirm IS NOT NULL
          AND PostingTime IS NOT NULL
          AND DATEDIFF(MINUTE, CAST(OperatorCarConfirm AS DATETIME), CAST(PostingTime AS DATETIME)) >= 0
    """, params, default=None)

    # นับเฉพาะรถที่โหลดเสร็จแล้ว (มี PostingTime) เพื่อใช้เป็นตัวส่วน
    completed_trucks = fetch_scalar("""
        SELECT COUNT(*)
        FROM [OBM_DWMS].[dbo].[vwTimeStampDashbaord]
        WHERE PlantName = %s
          AND OperatorCarConfirm >= %s
          AND OperatorCarConfirm <= %s
          AND OperatorCarConfirm IS NOT NULL
          AND PostingTime IS NOT NULL
    """, params)

    overtime_count = fetch_scalar(f"""
        SELECT COUNT(*)
        FROM [OBM_DWMS].[dbo].[vwTimeStampDashbaord]
        WHERE PlantName = %s
          AND OperatorCarConfirm >= %s
          AND OperatorCarConfirm <= %s
          AND OperatorCarConfirm IS NOT NULL
          AND PostingTime IS NOT NULL
          AND DATEDIFF(MINUTE, CAST(OperatorCarConfirm AS DATETIME), CAST(PostingTime AS DATETIME)) > {OVERTIME_THRESHOLD_MINUTES}
    """, params)

    # rate คิดจากรถที่เสร็จแล้ว (มี PostingTime) ไม่ใช่รถทั้งหมด
    overtime_rate = round(overtime_count / completed_trucks * 100, 1) if completed_trucks else 0.0

    # เวลาคันแรกที่แตะบัตร (OperatorCarConfirm แรกสุด) — คืนเป็น HH:MM
    first_picking = fetch_scalar("""
        SELECT CONVERT(VARCHAR(5), MIN(CAST(OperatorCarConfirm AS DATETIME)), 108)
        FROM [OBM_DWMS].[dbo].[vwTimeStampDashbaord]
        WHERE PlantName = %s
          AND OperatorCarConfirm >= %s
          AND OperatorCarConfirm <= %s
          AND OperatorCarConfirm IS NOT NULL
    """, params, default=None)

    # เวลาคันสุดท้ายที่ออกจากโรงงาน (PostingTime ล่าสุด) — คืนเป็น HH:MM
    last_posting = fetch_scalar("""
        SELECT CONVERT(VARCHAR(5), MAX(CAST(PostingTime AS DATETIME)), 108)
        FROM [OBM_DWMS].[dbo].[vwTimeStampDashbaord]
        WHERE PlantName = %s
          AND OperatorCarConfirm >= %s
          AND OperatorCarConfirm <= %s
          AND PostingTime IS NOT NULL
    """, params, default=None)

    return {
        "total_trucks": total_trucks,
        "avg_wait_min": round(avg_wait_min, 1) if avg_wait_min is not None else None,
        "avg_load_min": round(avg_load_min, 1) if avg_load_min is not None else None,
        "avg_total_min": round(avg_total_min, 1) if avg_total_min is not None else None,
        "overtime_count": overtime_count,
        "overtime_rate": overtime_rate,
        "first_picking": first_picking,
        "last_posting": last_posting,
    }


def _pct_change(current, previous):
    if previous is None or current is None:
        return None
    if previous == 0:
        return None
    return round((current - previous) / previous * 100, 1)


def get_kpi_summary_data(preset: str = 'today', date_from: str = None, date_to: str = None):
    start_dt, end_dt = get_date_range(preset, date_from, date_to)
    prev_start, prev_end = get_prev_date_range(preset, date_from, date_to)

    current = _kpi_data(start_dt, end_dt)
    previous = _kpi_data(prev_start, prev_end)

    return {
        "preset": preset,
        "period": {
            "from": start_dt.strftime("%Y-%m-%d %H:%M:%S"),
            "to": end_dt.strftime("%Y-%m-%d %H:%M:%S"),
        },
        "kpi": {
            "total_trucks": {
                "value": current["total_trucks"],
                "prev": previous["total_trucks"],
                "change_pct": _pct_change(current["total_trucks"], previous["total_trucks"]),
            },
            "avg_wait_min": {
                "value": current["avg_wait_min"],
                "prev": previous["avg_wait_min"],
                "change_pct": _pct_change(current["avg_wait_min"], previous["avg_wait_min"]),
            },
            "avg_load_min": {
                "value": current["avg_load_min"],
                "prev": previous["avg_load_min"],
                "change_pct": _pct_change(current["avg_load_min"], previous["avg_load_min"]),
            },
            "avg_total_min": {
                "value": current["avg_total_min"],
                "prev": previous["avg_total_min"],
                "change_pct": _pct_change(current["avg_total_min"], previous["avg_total_min"]),
            },
            "overtime": {
                "value": current["overtime_count"],
                "rate": current["overtime_rate"],
                "prev": previous["overtime_count"],
                "change_pct": _pct_change(current["overtime_count"], previous["overtime_count"]),
            },
            "first_picking": {
                "value": current["first_picking"],
                "prev": previous["first_picking"],
                "change_pct": None,
            },
            "last_posting": {
                "value": current["last_posting"],
                "prev": previous["last_posting"],
                "change_pct": None,
            },
        },
    }
