import asyncio
import logging
from datetime import datetime

from asgiref.sync import sync_to_async
from django.utils import timezone

from ..constants import (
    DEFAULT_DASHBOARD_CACHE_MAX_AGE_SECONDS,
    DEFAULT_DASHBOARD_REFRESH_INTERVAL_SECONDS,
    PLANT_CODE,
    PLANT_NAME,
)
from ..utils.date_ranges import get_today_range
from ..utils.db import fetch_all_dicts
from ..utils.sql_fragments import EFFECTIVE_DATE_CASE
from .dashboard_summary import get_dashboard_summary_data
from .notification_logger import update_notifications
from .notification_service import compute_notifications
from .post_locations import get_post_locations_response_data
from .prediction_logger import log_predictions
from .prediction_report import get_all_today_trucks_with_predictions
from .realtime.broadcaster import Broadcaster
from .realtime.snapshot_store import SnapshotStore
from .truck_queues import get_truck_queues_data

_COMPLETED_LOG_INTERVAL_SECONDS = 120

logger = logging.getLogger(__name__)

_ALL_TODAY_OCC_SQL = f"""
    SELECT
        OperatorCarConfirm AS operatorCarConfirm,
        PostingTime AS postingTime,
        CarType AS rawCarType
    FROM [OBM_DWMS].[dbo].[vwTimeStampDashbaord]
    WHERE PlantName = %s
    AND OperatorCarConfirm IS NOT NULL
    AND ({EFFECTIVE_DATE_CASE}) >= %s
    AND ({EFFECTIVE_DATE_CASE}) <= %s
"""


def _fetch_all_today_for_ranking() -> list[dict]:
    """Fetch all of today's trucks (arrival, exit, and car type).

    Used to compute the correct day-level TruckSeqNo rank for active trucks, and
    to build the completed-truck history for live rolling-average features."""
    start_dt, end_dt = get_today_range()
    try:
        return fetch_all_dicts(_ALL_TODAY_OCC_SQL, [PLANT_NAME, start_dt, end_dt])
    except Exception:
        logger.exception("Failed to fetch all-today trucks for ranking — will rank from active queue only")
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
        logger.exception("Prediction enrichment failed — serving without predictions")
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


def _process_notifications(truck_queues: list, plant_code: str, now: datetime) -> list:
    try:
        notifications = compute_notifications(truck_queues, now)
        update_notifications(notifications, truck_queues, plant_code, now)
        return notifications
    except Exception:
        logger.exception("Notification processing failed for plant_code=%s", plant_code)
        return []


def _do_log_completed_predictions() -> None:
    log_predictions(PLANT_NAME, get_all_today_trucks_with_predictions())


class DashboardBroadcaster(Broadcaster):
    """Dashboard broadcaster ที่ inject notifications เข้า payload และ log predictions ทุก 2 นาที."""

    def __init__(self, store):
        super().__init__(
            store,
            refresh_interval_seconds=DEFAULT_DASHBOARD_REFRESH_INTERVAL_SECONDS,
            name="dashboard",
        )
        self._log_tasks: dict[str, asyncio.Task] = {}

    async def _broadcast_forever(self, plant_code):
        try:
            while True:
                try:
                    state = await sync_to_async(self._store.refresh, thread_sensitive=False)(
                        plant_code=plant_code
                    )
                    payload = state["payload"]
                    now = datetime.now()
                    truck_queues = payload.get("truck_queues", []) if payload else []
                    notifications = await asyncio.get_running_loop().run_in_executor(
                        None, _process_notifications, truck_queues, plant_code, now
                    )
                    enriched = {**payload, "notifications": notifications} if payload else payload
                    self._publish(plant_code, enriched)
                except asyncio.CancelledError:
                    raise
                except Exception:
                    logger.exception("Dashboard broadcaster refresh failed for plant_code=%s", plant_code)

                await asyncio.sleep(self._refresh_interval_seconds)
        except asyncio.CancelledError:
            logger.debug("Stopped dashboard broadcaster for plant_code=%s", plant_code)
            raise

    async def start(self, plant_code=PLANT_CODE):
        """Start both the broadcast loop and prediction-log loop as persistent background tasks."""
        await super().start(plant_code)
        async with self._tasks_lock:
            log_task = self._log_tasks.get(plant_code)
            if log_task is None or log_task.done():
                self._log_tasks[plant_code] = asyncio.create_task(
                    self._log_predictions_forever()
                )

    async def stop(self, plant_code=PLANT_CODE):
        """Cancel both the broadcast loop and prediction-log loop on server shutdown."""
        await super().stop(plant_code)
        log_task_to_cancel = None
        async with self._tasks_lock:
            log_task_to_cancel = self._log_tasks.pop(plant_code, None)
        if log_task_to_cancel is not None:
            log_task_to_cancel.cancel()
            try:
                await log_task_to_cancel
            except asyncio.CancelledError:
                pass

    async def register_subscriber(self, plant_code=PLANT_CODE):
        queue = await super().register_subscriber(plant_code)
        async with self._tasks_lock:
            log_task = self._log_tasks.get(plant_code)
            if log_task is None or log_task.done():
                self._log_tasks[plant_code] = asyncio.create_task(
                    self._log_predictions_forever()
                )
        return queue

    async def unregister_subscriber(self, queue, plant_code=PLANT_CODE):
        # ลบ subscriber queue ออก แต่ไม่ cancel broadcast หรือ log task
        # ทั้งสองตัวทำงานตลอดผ่าน lifespan เพื่อบันทึก notification และ prediction log
        async with self._tasks_lock:
            self._remove_subscriber_queue(queue, plant_code)

    async def _log_predictions_forever(self):
        try:
            while True:
                try:
                    await asyncio.get_running_loop().run_in_executor(None, _do_log_completed_predictions)
                except asyncio.CancelledError:
                    raise
                except Exception:
                    logger.exception("Completed prediction logging failed")
                await asyncio.sleep(_COMPLETED_LOG_INTERVAL_SECONDS)
        except asyncio.CancelledError:
            logger.debug("Stopped prediction log task")
            raise


dashboard_snapshot_store = SnapshotStore(
    get_dashboard_snapshot_data,
    default_max_age_seconds=DEFAULT_DASHBOARD_CACHE_MAX_AGE_SECONDS,
)

dashboard_broadcaster = DashboardBroadcaster(dashboard_snapshot_store)
