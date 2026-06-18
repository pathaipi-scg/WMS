from datetime import date as date_type, datetime, time, timedelta

from django.utils import timezone

_PRESET_DAYS = {
    'today': 1,
    '7d':    7,
    '30d':   30,
    '3m':    90,
    '6m':    180,
    '1y':    365,
}


def parse_datetime(value, *, strip_tz: bool = False) -> datetime | None:
    """Parse a DB value (datetime object or ISO string) into a datetime.

    Returns None for empty/invalid values. With ``strip_tz=True`` the result is
    made naive (tzinfo dropped) to match the log DB's naive timestamps.
    """
    if not value:
        return None
    if isinstance(value, datetime):
        return value.replace(tzinfo=None) if strip_tz else value
    try:
        dt = datetime.fromisoformat(str(value))
    except (ValueError, TypeError):
        return None
    return dt.replace(tzinfo=None) if strip_tz else dt


def get_today_range():
    today = timezone.localdate()
    start_dt = datetime.combine(today, time.min)
    end_dt = datetime.combine(today, time.max)
    return start_dt, end_dt


def get_date_range(preset: str = 'today', date_from: str = None, date_to: str = None):
    """คืนช่วงเวลา (start_dt, end_dt) ตาม preset หรือ custom date"""
    if preset == 'custom' and date_from and date_to:
        start_dt = datetime.combine(date_type.fromisoformat(date_from), time.min)
        end_dt = datetime.combine(date_type.fromisoformat(date_to), time.max)
        return start_dt, end_dt

    today = timezone.localdate()
    days = _PRESET_DAYS.get(preset, 1)
    end_dt = datetime.combine(today, time.max)
    start_dt = datetime.combine(today - timedelta(days=days - 1), time.min)
    return start_dt, end_dt


def get_prev_date_range(preset: str = 'today', date_from: str = None, date_to: str = None):
    """คืนช่วงเวลาก่อนหน้า (ขนาดเดียวกัน) สำหรับเปรียบเทียบ"""
    if preset == 'custom' and date_from and date_to:
        start = date_type.fromisoformat(date_from)
        end = date_type.fromisoformat(date_to)
        delta = (end - start).days + 1
        prev_end = datetime.combine(start - timedelta(days=1), time.max)
        prev_start = datetime.combine(start - timedelta(days=delta), time.min)
        return prev_start, prev_end

    today = timezone.localdate()
    days = _PRESET_DAYS.get(preset, 1)
    prev_end = datetime.combine(today - timedelta(days=days), time.max)
    prev_start = datetime.combine(today - timedelta(days=days * 2 - 1), time.min)
    return prev_start, prev_end
