from ..constants import PLANT_CODE
from ..utils.date_ranges import get_date_range
from ..utils.log_db import get_log_db_connection

_FALLBACK_LABELS = {
    1: "รอเรียก",
    2: "รอโหลด",
    3: "โหลด",
    4: "รอปิดงาน",
    5: "รอ Post",
}


def get_notification_summary_data(preset: str = 'today', date_from: str = None, date_to: str = None):
    start_dt, end_dt = get_date_range(preset, date_from, date_to)

    conn = get_log_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT DetailCode, NotiStatus, COUNT(*) AS cnt
            FROM [WMS].[dbo].[LogNotification]
            WHERE PlantName = ?
              AND NotiTime >= ?
              AND NotiTime <= ?
            GROUP BY DetailCode, NotiStatus
            ORDER BY DetailCode ASC
            """,
            [PLANT_CODE, start_dt, end_dt],
        )
        cols = [col[0] for col in cursor.description]
        rows = [dict(zip(cols, row)) for row in cursor.fetchall()]
    finally:
        conn.close()

    total = sum(r["cnt"] for r in rows)
    data = [
        {
            "detail_code": r["DetailCode"],
            "label": r["NotiStatus"] or _FALLBACK_LABELS.get(r["DetailCode"], f"รหัส {r['DetailCode']}"),
            "count": r["cnt"],
            "pct": round(r["cnt"] / total * 100, 1) if total else 0.0,
        }
        for r in rows
    ]
    return {"preset": preset, "total": total, "data": data}
