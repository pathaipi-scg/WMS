from __future__ import annotations

import logging
import threading
from datetime import datetime

from ..utils.date_ranges import parse_datetime
from ..utils.log_db import get_log_db_connection
from .notification_service import get_resolved_at

logger = logging.getLogger(__name__)

# ต้องหายจาก snapshot ติดต่อกันนานกว่านี้ จึงจะถือว่า resolved จริง
_RESOLVE_GRACE_SECONDS = 30

# รอหา resolved_at จาก DB นานสุดเท่าไร ก่อน fallback เป็น now
_RESOLVE_TIMEOUT_SECONDS = 600

# (thai_text, detail_code) สำหรับ INSERT ลง LogNotification
_TYPE_META: dict[str, tuple[str, int]] = {
    "pending-call":     ("รอเรียก",  1),
    "waiting-load":     ("รอโหลด",   2),
    "loading-too-long": ("โหลด",     3),
    "waiting-close":    ("รอปิดงาน", 4),
    "waiting-post":     ("รอ Post",  5),
}

# คอลัมน์ใน vwTimeStampDashbaord ที่ใช้เป็น "เวลาสิ้นสุด" ของแต่ละ type
# (whitelist hardcoded — ใช้ต่อ string ใน SQL ได้อย่างปลอดภัย)
_RESOLVED_COLUMN_BY_TYPE: dict[str, str] = {
    "pending-call":     "CarConfirm",
    "waiting-load":     "FirstPostPallet",
    "loading-too-long": "LastPostPallet",
    "waiting-close":    "CheckerClose",
    "waiting-post":     "PostingTime",
}

_UPSERT_SQL = """
    MERGE [WMS].[dbo].[LogNotification] AS tgt
    USING (VALUES (?,?,?,?,?,?,?)) AS src
        (PlantName, PackListNo, CarNo, NotiTime, NotiStatus, DetailCode, Duration)
    ON tgt.PackListNo = src.PackListNo AND tgt.NotiStatus = src.NotiStatus
    WHEN MATCHED THEN
        UPDATE SET Duration = src.Duration
    WHEN NOT MATCHED THEN
        INSERT (PlantName, PackListNo, CarNo, NotiTime, NotiStatus, DetailCode, Duration)
        VALUES (src.PlantName, src.PackListNo, src.CarNo,
                src.NotiTime, src.NotiStatus, src.DetailCode, src.Duration);
"""

# state ที่เก็บในหน่วยความจำ
_active: dict[str, dict] = {}   # key → entry ที่กำลัง track
_lock = threading.Lock()


def _upsert_rows(rows: list[tuple]) -> None:
    try:
        conn = get_log_db_connection()
        try:
            with conn:
                conn.cursor().executemany(_UPSERT_SQL, rows)
        finally:
            conn.close()
    except Exception:
        logger.exception("Failed to upsert notification log rows")


def _fetch_resolved_time(pack_list_no: str, noti_type: str) -> datetime | None:
    """Query เวลาสิ้นสุดจริงจาก DB กรณี truck หลุดจาก snapshot ก่อนระบบอ่านค่าทัน"""
    column = _RESOLVED_COLUMN_BY_TYPE.get(noti_type)
    if not column:
        return None
    try:
        from ..utils.db import fetch_scalar
        result = fetch_scalar(
            f"SELECT {column} FROM [OBM_DWMS].[dbo].[vwTimeStampDashbaord]"
            f" WHERE PackListNo = %s AND {column} IS NOT NULL",
            [pack_list_no],
            default=None,
        )
        return parse_datetime(result, strip_tz=True)
    except Exception:
        logger.exception("Failed to fetch %s for %s", column, pack_list_no)
        return None


def update_notifications(
    current_notifications: list[dict],
    truck_queues: list[dict],
    plant_code: str,
    now: datetime,
) -> None:
    current_keys = {f"{plant_code}-{n['id']}" for n in current_notifications}
    queue_map = {q.get("packListNo", ""): q for q in truck_queues}
    rows_to_insert: list[tuple] = []

    with _lock:
        # 1. notification ที่ยังอยู่ — เพิ่มใหม่ หรือ ยกเลิก grace period ถ้าเพิ่งกลับมา
        for n in current_notifications:
            key = f"{plant_code}-{n['id']}"
            if key not in _active:
                try:
                    triggered_at = datetime.fromisoformat(n["triggeredAt"]).replace(tzinfo=None)
                except (KeyError, ValueError):
                    triggered_at = now
                _active[key] = {
                    "plant_code": plant_code,
                    "triggered_at": triggered_at,
                    "notification": n,
                    "missing_since": None,
                    "resolved_at": None,
                }
            else:
                _active[key]["missing_since"] = None
                _active[key]["notification"] = n

        # 2. notification ที่หายไปครั้งแรก — จับเวลาสิ้นสุดจาก snapshot ไว้เป็น fallback
        for key in set(_active) - current_keys:
            entry = _active[key]
            if entry["missing_since"] is not None:
                continue
            entry["missing_since"] = now
            n = entry["notification"]
            truck = queue_map.get(n.get("queueKey", ""))
            entry["resolved_at"] = get_resolved_at(truck, n["type"]) if truck else None

        # 3. notification ที่หายเกิน grace period → เช็ค DB ก่อน ถ้ามี resolved_at → log แล้ว pop
        #    ถ้าไม่มี resolved_at แปลว่ายังไม่จบ → รอ tick ถัดไป
        for key in list(_active):
            entry = _active[key]
            if entry["missing_since"] is None:
                continue
            if (now - entry["missing_since"]).total_seconds() < _RESOLVE_GRACE_SECONDS:
                continue

            n = entry["notification"]
            pack_list_no = n.get("queueKey", "")

            resolved_at = (
                _fetch_resolved_time(pack_list_no, n["type"])
                or entry["resolved_at"]
            )
            if resolved_at is None:
                waited = (now - entry["missing_since"]).total_seconds()
                if waited < _RESOLVE_TIMEOUT_SECONDS:
                    continue  # ยังไม่จบ รอ tick ถัดไป
                # รอนานเกินไป และหา resolved_at ไม่เจอ — ทิ้งโดยไม่บันทึก
                logger.warning(
                    "resolved_at not found for %s (%s) after %.0fs — dropping without log",
                    pack_list_no, n["type"], waited,
                )
                _active.pop(key)
                continue

            # ถ้า resolved ก่อน trigger แปลว่า alert มาช้า รถจบไปก่อนแล้ว ไม่บันทึก
            if resolved_at <= entry["triggered_at"]:
                _active.pop(key)
                continue

            _active.pop(key)
            noti_status, detail_code = _TYPE_META.get(n["type"], (n["type"], 0))
            duration_minutes = max(0, round((resolved_at - entry["triggered_at"]).total_seconds() / 60))
            rows_to_insert.append((
                entry["plant_code"], pack_list_no, n.get("licensePlate", ""),
                entry["triggered_at"], noti_status, detail_code, duration_minutes,
            ))

    if rows_to_insert:
        _upsert_rows(rows_to_insert)
