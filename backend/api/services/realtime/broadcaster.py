import asyncio
import logging

from asgiref.sync import sync_to_async

from ...constants import PLANT_CODE

logger = logging.getLogger(__name__)


class Broadcaster:
    """Generic per-plant snapshot broadcaster over asyncio queues.

    Generalises the dashboard broadcaster's subscriber/fan-out machinery so any
    feature can push a :class:`SnapshotStore` payload to every connected client.
    The dashboard keeps its own broadcaster because it also runs notification and
    prediction-logging side tasks inside the same loop.
    """

    def __init__(self, store, *, refresh_interval_seconds, name="realtime"):
        self._store = store
        self._refresh_interval_seconds = refresh_interval_seconds
        self._name = name
        self._tasks: dict[str, asyncio.Task] = {}
        self._tasks_lock = asyncio.Lock()
        self._subscriber_queues: dict[str, set[asyncio.Queue]] = {}

    def _publish(self, plant_code, payload):
        for queue in list(self._subscriber_queues.get(plant_code, set())):
            if queue.full():
                try:
                    queue.get_nowait()
                except asyncio.QueueEmpty:
                    pass

            queue.put_nowait(payload)

    async def _broadcast_forever(self, plant_code):
        try:
            while True:
                try:
                    state = await sync_to_async(self._store.refresh, thread_sensitive=False)(
                        plant_code=plant_code
                    )
                    self._publish(plant_code, state["payload"])
                except asyncio.CancelledError:
                    raise
                except Exception:
                    logger.exception(
                        "%s broadcaster refresh failed for plant_code=%s", self._name, plant_code
                    )

                await asyncio.sleep(self._refresh_interval_seconds)
        except asyncio.CancelledError:
            logger.debug("Stopped %s broadcaster for plant_code=%s", self._name, plant_code)
            raise

    async def register_subscriber(self, plant_code=PLANT_CODE):
        async with self._tasks_lock:
            queue = asyncio.Queue(maxsize=1)
            self._subscriber_queues.setdefault(plant_code, set()).add(queue)

            task = self._tasks.get(plant_code)

            if task is None or task.done():
                self._tasks[plant_code] = asyncio.create_task(self._broadcast_forever(plant_code))

            return queue

    def _remove_subscriber_queue(self, queue, plant_code) -> bool:
        """Remove a subscriber queue while the caller holds _tasks_lock.
        Returns True if plant_code has no remaining subscribers."""
        queues = self._subscriber_queues.get(plant_code)
        if queues is not None:
            queues.discard(queue)
        if queues:
            return False
        self._subscriber_queues.pop(plant_code, None)
        return True

    async def start(self, plant_code=PLANT_CODE):
        """Start the broadcast loop as a persistent background task (no subscriber queue)."""
        async with self._tasks_lock:
            task = self._tasks.get(plant_code)
            if task is None or task.done():
                self._tasks[plant_code] = asyncio.create_task(
                    self._broadcast_forever(plant_code)
                )

    async def stop(self, plant_code=PLANT_CODE):
        """Cancel the broadcast loop (called on server shutdown)."""
        task_to_cancel = None
        async with self._tasks_lock:
            task_to_cancel = self._tasks.pop(plant_code, None)
        if task_to_cancel is not None:
            task_to_cancel.cancel()
            try:
                await task_to_cancel
            except asyncio.CancelledError:
                pass

    async def unregister_subscriber(self, queue, plant_code=PLANT_CODE):
        task_to_cancel = None
        async with self._tasks_lock:
            last = self._remove_subscriber_queue(queue, plant_code)
            if last:
                task_to_cancel = self._tasks.pop(plant_code, None)
        if task_to_cancel is not None:
            task_to_cancel.cancel()
            try:
                await task_to_cancel
            except asyncio.CancelledError:
                pass
