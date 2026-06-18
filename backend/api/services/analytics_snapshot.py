import logging

from ..constants import (
    ANALYTICS_SNAPSHOT_CACHE_MAX_AGE_SECONDS,
    ANALYTICS_SNAPSHOT_REFRESH_INTERVAL_SECONDS,
    PLANT_CODE,
)
from .analytics_avg_time_by_truck_type import get_avg_time_by_truck_type_data
from .analytics_kpi_summary import get_kpi_summary_data
from .analytics_notification_summary import get_notification_summary_data
from .analytics_product_volume import get_product_volume_data
from .analytics_queue_distribution import get_queue_distribution_data
from .analytics_throughput import get_throughput_data
from .realtime.broadcaster import Broadcaster
from .realtime.snapshot_store import SnapshotStore

logger = logging.getLogger(__name__)


def get_analytics_snapshot_data(plant_code=PLANT_CODE):
    """Bundle the default "today" view of the Analytics page (all 5 datasets at
    their default grouping) so it can be pushed over WebSocket and served by the
    REST snapshot endpoint with an identical shape."""
    try:
        notification_summary = get_notification_summary_data("today", None, None)
    except Exception:
        logger.exception("Failed to fetch notification summary for analytics snapshot")
        notification_summary = {"preset": "today", "total": 0, "data": []}

    return {
        "success": True,
        "plant_code": plant_code,
        "kpi": get_kpi_summary_data("today", None, None),
        "throughput": get_throughput_data("today", "hour", None, None),
        "queue_distribution": get_queue_distribution_data("today", None, None),
        "product_volume": get_product_volume_data("today", None, None),
        "avg_time_by_truck_type": get_avg_time_by_truck_type_data("today", "hour", None, None),
        "notification_summary": notification_summary,
    }


analytics_snapshot_store = SnapshotStore(
    get_analytics_snapshot_data,
    default_max_age_seconds=ANALYTICS_SNAPSHOT_CACHE_MAX_AGE_SECONDS,
)

analytics_broadcaster = Broadcaster(
    analytics_snapshot_store,
    refresh_interval_seconds=ANALYTICS_SNAPSHOT_REFRESH_INTERVAL_SECONDS,
    name="analytics",
)
