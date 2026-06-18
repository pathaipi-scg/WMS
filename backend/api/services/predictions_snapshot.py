from ..constants import (
    PLANT_CODE,
    PREDICTIONS_SNAPSHOT_CACHE_MAX_AGE_SECONDS,
    PREDICTIONS_SNAPSHOT_REFRESH_INTERVAL_SECONDS,
)
from .prediction_metrics import _group_live_rows, _overall_from_live
from .prediction_report import _build_report, _error_rows_from_pairs, _fetch_trucks_with_predictions
from .realtime.broadcaster import Broadcaster
from .realtime.snapshot_store import SnapshotStore
from ..utils.date_ranges import get_today_range


def get_predictions_snapshot_data(plant_code=PLANT_CODE):
    """Bundle the default "today" view of the Predictions page (prediction log +
    hourly metrics timeseries) so it can be pushed over WebSocket and served by
    the REST snapshot endpoint with an identical shape.

    Fetches vwTimeStampDashbaord and runs ML predictions exactly once, then
    derives both the report table and the metrics timeseries from the same data.
    """
    start_dt, end_dt = get_today_range()
    trucks, predictions = _fetch_trucks_with_predictions(start_dt, end_dt)
    error_rows = _error_rows_from_pairs(trucks, predictions)

    return {
        "success": True,
        "plant_code": plant_code,
        "log": _build_report(trucks, predictions),
        "metrics_timeseries": {
            "preset": "today",
            "group_by": "hour",
            "data": _group_live_rows(error_rows, "hour"),
            "summary": _overall_from_live(error_rows),
        },
    }


predictions_snapshot_store = SnapshotStore(
    get_predictions_snapshot_data,
    default_max_age_seconds=PREDICTIONS_SNAPSHOT_CACHE_MAX_AGE_SECONDS,
)

predictions_broadcaster = Broadcaster(
    predictions_snapshot_store,
    refresh_interval_seconds=PREDICTIONS_SNAPSHOT_REFRESH_INTERVAL_SECONDS,
    name="predictions",
)
