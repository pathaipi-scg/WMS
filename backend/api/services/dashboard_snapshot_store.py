import threading
import time
from dataclasses import dataclass, field

from ..constants import PLANT_CODE, DEFAULT_DASHBOARD_CACHE_MAX_AGE_SECONDS
from .dashboard_snapshot import get_dashboard_snapshot_data


@dataclass
class DashboardSnapshotEntry:
    payload: dict | None = None
    version: int = 0
    refreshed_at_monotonic: float = 0.0
    refresh_lock: threading.Lock = field(default_factory=threading.Lock)


_entries: dict[str, DashboardSnapshotEntry] = {}
_entries_guard = threading.Lock()


def _get_entry(plant_code=PLANT_CODE):
    with _entries_guard:
        entry = _entries.get(plant_code)

        if entry is None:
            entry = DashboardSnapshotEntry()
            _entries[plant_code] = entry

        return entry


def _is_snapshot_stale(entry, max_age_seconds):
    if entry.payload is None:
        return True

    return time.monotonic() - entry.refreshed_at_monotonic >= max_age_seconds


def reset_dashboard_snapshot_store():
    with _entries_guard:
        _entries.clear()


def refresh_dashboard_snapshot_data(plant_code=PLANT_CODE):
    entry = _get_entry(plant_code)

    with entry.refresh_lock:
        payload = get_dashboard_snapshot_data(plant_code=plant_code)
        entry.payload = payload
        entry.version += 1
        entry.refreshed_at_monotonic = time.monotonic()

        return {
            "payload": entry.payload,
            "version": entry.version,
            "has_payload": True,
            "updated_by_current_process": True,
        }


def get_cached_dashboard_snapshot_data(
    plant_code=PLANT_CODE,
    *,
    max_age_seconds=DEFAULT_DASHBOARD_CACHE_MAX_AGE_SECONDS,
    force_refresh=False,
):
    entry = _get_entry(plant_code)

    if not force_refresh and not _is_snapshot_stale(entry, max_age_seconds):
        return entry.payload

    refreshed_state = refresh_dashboard_snapshot_data(plant_code=plant_code)
    return refreshed_state["payload"]
