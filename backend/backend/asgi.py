"""
ASGI config for backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

from api.websocket import (
    analytics_stream_application,
    dashboard_stream_application,
    predictions_stream_application,
)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

django_asgi_application = get_asgi_application()

_WEBSOCKET_ROUTES = {
    "/ws/dashboard/stream/": dashboard_stream_application,
    "/ws/predictions/stream/": predictions_stream_application,
    "/ws/analytics/stream/": analytics_stream_application,
}


async def _lifespan(receive, send):
    """Start/stop background tasks tied to server lifetime."""
    from api.constants import PLANT_CODE
    from api.services.dashboard_snapshot import dashboard_broadcaster

    while True:
        message = await receive()
        if message["type"] == "lifespan.startup":
            # เริ่ม dashboard broadcast loop ทันทีที่ server start
            # เพื่อให้ notification logging ทำงานตลอดแม้ไม่มีใครเปิดหน้า dashboard
            try:
                await dashboard_broadcaster.start(PLANT_CODE)
            except Exception:
                import logging
                logging.getLogger(__name__).exception("Dashboard broadcaster failed to start")
            await send({"type": "lifespan.startup.complete"})
        elif message["type"] == "lifespan.shutdown":
            # analytics/predictions broadcasters run only on-demand (no server-side side effects)
            await dashboard_broadcaster.stop(PLANT_CODE)
            await send({"type": "lifespan.shutdown.complete"})
            return


async def application(scope, receive, send):
    if scope["type"] == "lifespan":
        await _lifespan(receive, send)
        return

    if scope["type"] == "websocket":
        handler = _WEBSOCKET_ROUTES.get(scope.get("path"))
        if handler is not None:
            await handler(scope, receive, send)
            return

    await django_asgi_application(scope, receive, send)
