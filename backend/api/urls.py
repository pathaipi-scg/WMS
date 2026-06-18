from django.urls import path

from .views import (
    dashboard_snapshot, dashboard_summary, post_locations_api,
    prediction_report, prediction_log, prediction_metrics_timeseries, prediction_models, predictions_snapshot, truck_queues,
    analytics_kpi_summary, analytics_throughput, analytics_queue_distribution,
    analytics_product_volume, analytics_avg_time_by_truck_type, analytics_snapshot,
    analytics_notification_summary,
)

urlpatterns = [
    path("dashboard/snapshot/", dashboard_snapshot, name="dashboard_snapshot"),
    path("dashboard/summary/", dashboard_summary, name="dashboard_summary"),
    path("dashboard/truck_queues/", truck_queues, name="truck_queues"),
    path("dashboard/post-locations/", post_locations_api, name="post_locations_api"),
    path("predictions/report/", prediction_report, name="prediction_report"),
    path("predictions/log/", prediction_log, name="prediction_log"),
    path("predictions/metrics-timeseries/", prediction_metrics_timeseries, name="prediction_metrics_timeseries"),
    path("predictions/models/", prediction_models, name="prediction_models"),
    path("predictions/snapshot/", predictions_snapshot, name="predictions_snapshot"),
    path("analytics/snapshot/", analytics_snapshot, name="analytics_snapshot"),
    path("analytics/kpi-summary/", analytics_kpi_summary, name="analytics_kpi_summary"),
    path("analytics/throughput/", analytics_throughput, name="analytics_throughput"),
    path("analytics/queue-distribution/", analytics_queue_distribution, name="analytics_queue_distribution"),
    path("analytics/product-volume/", analytics_product_volume, name="analytics_product_volume"),
    path("analytics/avg-time-by-truck-type/", analytics_avg_time_by_truck_type, name="analytics_avg_time_by_truck_type"),
    path("analytics/notification-summary/", analytics_notification_summary, name="analytics_notification_summary"),
]
