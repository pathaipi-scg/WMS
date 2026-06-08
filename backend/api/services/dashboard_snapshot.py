import logging

from django.utils import timezone

from ..constants import PLANT_CODE, PLANT_NAME, PLANT_NAME as _PLANT_NAME
from ..utils.date_ranges import get_today_range
from ..utils.db import fetch_all_dicts
from ..utils.sql_fragments import EFFECTIVE_DATE_CASE
from .dashboard_summary import get_dashboard_summary_data
from .post_locations import get_post_locations_response_data
from .truck_queues import get_truck_queues_data

log = logging.getLogger(__name__)

_ALL_TODAY_OCC_SQL = f"""
    SELECT OperatorCarConfirm AS operatorCarConfirm
    FROM [OBM_DWMS].[dbo].[vwTimeStampDashbaord]
    WHERE PlantName = %s
    AND OperatorCarConfirm IS NOT NULL
    AND ({EFFECTIVE_DATE_CASE}) >= %s
    AND ({EFFECTIVE_DATE_CASE}) <= %s
"""


def _fetch_all_today_for_ranking() -> list[dict]:
    """Fetch minimal rows (OperatorCarConfirm only) for all trucks today.
    Used to compute the correct day-level TruckSeqNo rank for active trucks."""
    start_dt, end_dt = get_today_range()
    try:
        return fetch_all_dicts(_ALL_TODAY_OCC_SQL, [_PLANT_NAME, start_dt, end_dt])
    except Exception:
        log.exception("Failed to fetch all-today trucks for ranking — will rank from active queue only")
        return []


def get_dashboard_snapshot_data(plant_code=PLANT_CODE):
    post_locations = get_post_locations_response_data(plant_code=plant_code)
    truck_queues = get_truck_queues_data()

    try:
        from .prediction import build_predictions
        all_today = _fetch_all_today_for_ranking()
        predictions = build_predictions(truck_queues, reference_trucks=all_today or None)
        for truck, pred in zip(truck_queues, predictions):
            if pred:
                truck["predictedTotalTimeMin"] = pred["predictedTotalTimeMin"]
                truck["predictedFinishTime"] = pred["predictedFinishTime"]
            else:
                truck["predictedTotalTimeMin"] = None
                truck["predictedFinishTime"] = None
    except Exception:
        log.exception("Prediction enrichment failed — serving without predictions")
        for truck in truck_queues:
            truck["predictedTotalTimeMin"] = None
            truck["predictedFinishTime"] = None

    return {
        "success": True,
        "plant_code": plant_code,
        "plant_name": post_locations.get("plant_name", PLANT_NAME),
        "captured_at": timezone.localtime().isoformat(),
        "summary": get_dashboard_summary_data(),
        "truck_queues": truck_queues,
        "yards": post_locations.get("yards", []),
    }
