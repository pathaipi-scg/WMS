import asyncio
import json
import logging
from urllib.parse import parse_qs

from asgiref.sync import sync_to_async

from .constants import PLANT_CODE
from .services.dashboard_broadcaster import register_dashboard_subscriber, unregister_dashboard_subscriber
from .services.dashboard_snapshot_store import get_cached_dashboard_snapshot_data

logger = logging.getLogger(__name__)


def _get_query_value(query_params, key, default_value):
    values = query_params.get(key)

    if not values:
        return default_value

    return values[0]


async def _send_snapshot(send, payload):
    await send(
        {
            "type": "websocket.send",
            "text": json.dumps(
                {
                    "event": "dashboard.snapshot",
                    "payload": payload,
                },
                ensure_ascii=False,
                default=str,
            ),
        }
    )


async def dashboard_stream_application(scope, receive, send):
    query_params = parse_qs(scope.get("query_string", b"").decode("utf-8"))
    plant_code = _get_query_value(query_params, "plant_code", PLANT_CODE)

    connect_message = await receive()

    if connect_message.get("type") != "websocket.connect":
        return

    await send({"type": "websocket.accept"})
    subscriber_queue = await register_dashboard_subscriber(plant_code=plant_code)

    try:
        payload = await sync_to_async(get_cached_dashboard_snapshot_data, thread_sensitive=True)(
            plant_code=plant_code
        )
        await _send_snapshot(send, payload)

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
                await _send_snapshot(send, snapshot_task.result())
    except Exception:
        logger.exception("Dashboard websocket stream failed for plant_code=%s", plant_code)

        try:
            await send(
                {
                    "type": "websocket.send",
                    "text": json.dumps(
                        {
                            "event": "dashboard.error",
                            "message": "Unable to stream dashboard updates.",
                        }
                    ),
                }
            )
        except Exception:
            logger.exception("Unable to send websocket error payload")
    finally:
        await unregister_dashboard_subscriber(subscriber_queue, plant_code=plant_code)

        try:
            await send({"type": "websocket.close", "code": 1000})
        except Exception:
            pass
