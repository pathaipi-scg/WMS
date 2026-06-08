import asyncio
import logging

from asgiref.sync import sync_to_async

from ..constants import PLANT_CODE, DEFAULT_DASHBOARD_REFRESH_INTERVAL_SECONDS
from .dashboard_snapshot_store import refresh_dashboard_snapshot_data

logger = logging.getLogger(__name__)

_broadcaster_tasks: dict[str, asyncio.Task] = {}
_broadcaster_tasks_lock = asyncio.Lock()
_subscriber_queues: dict[str, set[asyncio.Queue]] = {}


def _publish_snapshot(plant_code, payload):
    queues = list(_subscriber_queues.get(plant_code, set()))

    for queue in queues:
        if queue.full():
            try:
                queue.get_nowait()
            except asyncio.QueueEmpty:
                pass

        queue.put_nowait(payload)


async def _broadcast_snapshot_forever(plant_code, refresh_interval_seconds):
    last_sent_version = 0

    try:
        while True:
            try:
                snapshot_state = await sync_to_async(
                    refresh_dashboard_snapshot_data,
                    thread_sensitive=True,
                )(plant_code=plant_code)

                if snapshot_state["version"] != last_sent_version:
                    last_sent_version = snapshot_state["version"]
                    _publish_snapshot(plant_code, snapshot_state["payload"])
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception(
                    "Dashboard broadcaster refresh failed for plant_code=%s",
                    plant_code,
                )

            await asyncio.sleep(refresh_interval_seconds)
    except asyncio.CancelledError:
        logger.debug("Stopped dashboard broadcaster for plant_code=%s", plant_code)
        raise


async def register_dashboard_subscriber(
    plant_code=PLANT_CODE,
    *,
    refresh_interval_seconds=DEFAULT_DASHBOARD_REFRESH_INTERVAL_SECONDS,
):
    async with _broadcaster_tasks_lock:
        queue = asyncio.Queue(maxsize=1)
        _subscriber_queues.setdefault(plant_code, set()).add(queue)

        task = _broadcaster_tasks.get(plant_code)

        if task is not None and not task.done():
            return queue

        _broadcaster_tasks[plant_code] = asyncio.create_task(
            _broadcast_snapshot_forever(plant_code, refresh_interval_seconds)
        )
        return queue


async def unregister_dashboard_subscriber(queue, plant_code=PLANT_CODE):
    async with _broadcaster_tasks_lock:
        queues = _subscriber_queues.get(plant_code)

        if queues is not None:
            queues.discard(queue)

        if queues:
            return

        _subscriber_queues.pop(plant_code, None)
        task = _broadcaster_tasks.pop(plant_code, None)

        if task is not None:
            task.cancel()
