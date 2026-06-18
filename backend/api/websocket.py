import asyncio
import json
import logging
from urllib.parse import parse_qs

from asgiref.sync import sync_to_async

from .constants import PLANT_CODE
from .services.analytics_snapshot import analytics_broadcaster, analytics_snapshot_store
from .services.dashboard_snapshot import dashboard_broadcaster, dashboard_snapshot_store
from .services.predictions_snapshot import predictions_broadcaster, predictions_snapshot_store

logger = logging.getLogger(__name__)


def _get_query_value(query_params, key, default_value):
    values = query_params.get(key)

    if not values:
        return default_value

    return values[0]


def make_stream_application(*, event_name, broadcaster, get_initial_payload):
    """Build a raw-ASGI websocket app that streams a feature's snapshot.

    Mirrors ``dashboard_stream_application`` but is parameterised by event name,
    broadcaster and initial-payload fetcher so predictions/analytics reuse the
    same connect → send snapshot → ping/push loop.
    """
    error_event = f"{event_name.split('.')[0]}.error"

    async def stream_application(scope, receive, send):
        query_params = parse_qs(scope.get("query_string", b"").decode("utf-8"))
        plant_code = _get_query_value(query_params, "plant_code", PLANT_CODE)

        connect_message = await receive()

        if connect_message.get("type") != "websocket.connect":
            return

        await send({"type": "websocket.accept"})
        subscriber_queue = await broadcaster.register_subscriber(plant_code=plant_code)

        async def _send_payload(payload):
            await send(
                {
                    "type": "websocket.send",
                    "text": json.dumps(
                        {"event": event_name, "payload": payload},
                        ensure_ascii=False,
                        default=str,
                    ),
                }
            )

        try:
            payload = await sync_to_async(get_initial_payload, thread_sensitive=True)(
                plant_code=plant_code
            )
            await _send_payload(payload)

            while True:
                receive_task = asyncio.create_task(receive())
                snapshot_task = asyncio.create_task(subscriber_queue.get())

                done, pending = await asyncio.wait(
                    {receive_task, snapshot_task},
                    return_when=asyncio.FIRST_COMPLETED,
                )

                for pending_task in pending:
                    pending_task.cancel()

                if pending:
                    await asyncio.gather(*pending, return_exceptions=True)

                if receive_task in done:
                    message = receive_task.result()
                    message_type = message.get("type")

                    if message_type == "websocket.disconnect":
                        break

                    if message_type == "websocket.receive":
                        text = (message.get("text") or "").strip().lower()

                        if text == "ping":
                            await send(
                                {
                                    "type": "websocket.send",
                                    "text": json.dumps({"event": "pong"}),
                                }
                            )

                if snapshot_task in done:
                    await _send_payload(snapshot_task.result())
        except Exception:
            logger.exception("%s websocket stream failed for plant_code=%s", event_name, plant_code)

            try:
                await send(
                    {
                        "type": "websocket.send",
                        "text": json.dumps(
                            {"event": error_event, "message": "Unable to stream updates."}
                        ),
                    }
                )
            except Exception:
                logger.exception("Unable to send websocket error payload")
        finally:
            await broadcaster.unregister_subscriber(subscriber_queue, plant_code=plant_code)

            try:
                await send({"type": "websocket.close", "code": 1000})
            except Exception:
                pass

    return stream_application


dashboard_stream_application = make_stream_application(
    event_name="dashboard.snapshot",
    broadcaster=dashboard_broadcaster,
    get_initial_payload=dashboard_snapshot_store.get_cached,
)

predictions_stream_application = make_stream_application(
    event_name="predictions.snapshot",
    broadcaster=predictions_broadcaster,
    get_initial_payload=predictions_snapshot_store.get_cached,
)

analytics_stream_application = make_stream_application(
    event_name="analytics.snapshot",
    broadcaster=analytics_broadcaster,
    get_initial_payload=analytics_snapshot_store.get_cached,
)
