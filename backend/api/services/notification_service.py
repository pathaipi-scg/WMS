from __future__ import annotations

from datetime import datetime, timedelta

from ..utils.date_ranges import parse_datetime


def _get_first_date(queue: dict, fields: list[str]) -> datetime | None:
    for field in fields:
        dt = parse_datetime(queue.get(field), strip_tz=True)
        if dt is not None:
            return dt
    return None


_RULES = [
    {
        "type": "pending-call",
        "severity": "warning",
        "threshold_minutes": 5,
        "start_fields": ["operatorCarConfirm", "arrivalDate"],
        "complete_fields": ["carConfirm", "callDate"],
        "get_title": lambda q: f"รถ {q.get('licensePlate') or '-'} รอเรียก",
        "get_description": lambda q, e: f"ยื่นตั๋วแล้ว แต่ยังไม่ถูกเรียก {e} นาที",
    },
    {
        "type": "waiting-load",
        "severity": "orange",
        "threshold_minutes": 15,
        "start_fields": ["carConfirm", "callDate"],
        "complete_fields": ["firstPallet", "startDate"],
        "get_title": lambda q: f"รถ {q.get('licensePlate') or '-'} รอโหลด",
        "get_description": lambda q, e: f"ถูกเรียกแล้ว แต่ยังไม่เริ่มโหลด {e} นาที",
    },
    {
        "type": "loading-too-long",
        "severity": "danger",
        "threshold_minutes": 45,
        "start_fields": ["firstPallet", "startDate"],
        "complete_fields": ["lastPostPallet"],
        "get_title": lambda q: f"รถ {q.get('licensePlate') or '-'} โหลดนานเกินไป",
        "get_description": lambda q, e: f"กำลังโหลดสินค้า แต่ใช้เวลานานถึง {e} นาที",
    },
    {
        "type": "waiting-close",
        "severity": "danger",
        "threshold_minutes": 5,
        "start_fields": ["lastPostPallet"],
        "complete_fields": ["checkerClose"],
        "get_title": lambda q: f"รถ {q.get('licensePlate') or '-'} รอปิดงาน",
        "get_description": lambda q, e: f"โหลดเสร็จแล้ว แต่ยังไม่ปิดงาน {e} นาที",
    },
    {
        "type": "waiting-post",
        "severity": "danger",
        "threshold_minutes": 5,
        "start_fields": ["checkerClose"],
        "complete_fields": ["postingTime"],
        "get_title": lambda q: f"รถ {q.get('licensePlate') or '-'} รอ Post",
        "get_description": lambda q, e: f"ปิดงานแล้ว แต่ยังไม่ post {e} นาที",
    },
]


def _apply_rule(queue: dict, rule: dict, now: datetime) -> dict | None:
    start_dt = _get_first_date(queue, rule["start_fields"])
    if start_dt is None:
        return None

    if _get_first_date(queue, rule["complete_fields"]) is not None:
        return None

    elapsed_seconds = (now - start_dt).total_seconds()
    if elapsed_seconds < rule["threshold_minutes"] * 60:
        return None

    elapsed_minutes = round(elapsed_seconds / 60)
    triggered_dt = (start_dt + timedelta(minutes=rule["threshold_minutes"])).replace(microsecond=0)
    queue_key = queue.get("packListNo") or ""

    return {
        "id": f"{rule['type']}-{queue_key}",
        "type": rule["type"],
        "severity": rule["severity"],
        "title": rule["get_title"](queue),
        "description": rule["get_description"](queue, elapsed_minutes),
        "queueKey": queue_key,
        "licensePlate": queue.get("licensePlate") or "",
        "sequence": queue.get("sequence"),
        "postLocationName": queue.get("post_location_name") or "",
        "elapsedMinutes": elapsed_minutes,
        "thresholdMinutes": rule["threshold_minutes"],
        "startedAt": start_dt.isoformat(),
        "triggeredAt": triggered_dt.isoformat(),
    }


_COMPLETE_FIELDS_BY_TYPE: dict[str, list[str]] = {
    rule["type"]: rule["complete_fields"] for rule in _RULES
}


def get_resolved_at(queue: dict, notification_type: str) -> datetime | None:
    """Return the exact DB timestamp when a notification resolved (complete_fields value)."""
    fields = _COMPLETE_FIELDS_BY_TYPE.get(notification_type)
    return _get_first_date(queue, fields) if fields else None


def compute_notifications(truck_queues: list[dict], now: datetime) -> list[dict]:
    results = []
    for queue in truck_queues:
        for rule in _RULES:
            notification = _apply_rule(queue, rule, now)
            if notification is not None:
                results.append(notification)
    return results
