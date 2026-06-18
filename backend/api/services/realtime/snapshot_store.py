import threading
import time
from dataclasses import dataclass, field

from ...constants import PLANT_CODE


@dataclass
class _SnapshotEntry:
    payload: dict | None = None
    version: int = 0
    refreshed_at_monotonic: float = 0.0
    refresh_lock: threading.Lock = field(default_factory=threading.Lock)


class SnapshotStore:
    """Thread-safe, per-plant versioned cache for a snapshot built by ``builder_fn``.

    Generalises ``dashboard_snapshot_store`` so any feature (predictions, analytics)
    can reuse the same caching machinery. ``builder_fn`` is called as
    ``builder_fn(plant_code=...)`` and must return the payload dict.
    """

    def __init__(self, builder_fn, *, default_max_age_seconds):
        self._builder_fn = builder_fn
        self._default_max_age_seconds = default_max_age_seconds
        self._entries: dict[str, _SnapshotEntry] = {}
        self._entries_guard = threading.Lock()

    def _get_entry(self, plant_code):
        with self._entries_guard:
            entry = self._entries.get(plant_code)

            if entry is None:
                entry = _SnapshotEntry()
                self._entries[plant_code] = entry

            return entry

    def _is_stale(self, entry, max_age_seconds):
        if entry.payload is None:
            return True

        return time.monotonic() - entry.refreshed_at_monotonic >= max_age_seconds

    def reset(self):
        with self._entries_guard:
            self._entries.clear()

    def refresh(self, plant_code=PLANT_CODE):
        entry = self._get_entry(plant_code)

        with entry.refresh_lock:
            entry.payload = self._builder_fn(plant_code=plant_code)
            entry.version += 1
            entry.refreshed_at_monotonic = time.monotonic()

            return {"payload": entry.payload, "version": entry.version}

    def get_cached(self, plant_code=PLANT_CODE, *, max_age_seconds=None, force_refresh=False):
        max_age = self._default_max_age_seconds if max_age_seconds is None else max_age_seconds
        entry = self._get_entry(plant_code)

        if not force_refresh and not self._is_stale(entry, max_age):
            return entry.payload

        return self.refresh(plant_code=plant_code)["payload"]
