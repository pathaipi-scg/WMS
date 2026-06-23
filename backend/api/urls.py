from django.urls import path

from .auth import enforce_plant_access
from .views import (
    auth_login, auth_me, auth_add_plant, auth_delete_plant,
    dashboard_snapshot, dashboard_summary, post_locations_api,
    prediction_report, prediction_log, prediction_metrics_timeseries, prediction_models, predictions_snapshot, truck_queues,
    analytics_kpi_summary, analytics_throughput, analytics_queue_distribution,
    analytics_product_volume, analytics_avg_time_by_truck_type, analytics_snapshot,
    analytics_notification_summary,
)

urlpatterns = [
    # Auth — login/me (login เปิดสาธารณะ, me ตรวจ token ภายใน view เอง)
    path("auth/login/", auth_login, name="auth_login"),
    path("auth/me/", auth_me, name="auth_me"),
    path("auth/plants/", auth_add_plant, name="auth_add_plant"),
    path("auth/plants/<str:code>/", auth_delete_plant, name="auth_delete_plant"),

    # Data endpoints — ผู้ใช้ทั่วไปดูโรงงานสาธารณะได้โดยไม่ต้อง login;
    # ขอโรงงานอื่นต้อง login และมีสิทธิ์ (บังคับโดย enforce_plant_access)
    path("dashboard/snapshot/", enforce_plant_access(dashboard_snapshot), name="dashboard_snapshot"),
    path("dashboard/summary/", enforce_plant_access(dashboard_summary), name="dashboard_summary"),
    path("dashboard/truck_queues/", enforce_plant_access(truck_queues), name="truck_queues"),
    path("dashboard/post-locations/", enforce_plant_access(post_locations_api), name="post_locations_api"),
    path("predictions/report/", enforce_plant_access(prediction_report), name="prediction_report"),
    path("predictions/log/", enforce_plant_access(prediction_log), name="prediction_log"),
    path("predictions/metrics-timeseries/", enforce_plant_access(prediction_metrics_timeseries), name="prediction_metrics_timeseries"),
    path("predictions/models/", enforce_plant_access(prediction_models), name="prediction_models"),
    path("predictions/snapshot/", enforce_plant_access(predictions_snapshot), name="predictions_snapshot"),
    path("analytics/snapshot/", enforce_plant_access(analytics_snapshot), name="analytics_snapshot"),
    path("analytics/kpi-summary/", enforce_plant_access(analytics_kpi_summary), name="analytics_kpi_summary"),
    path("analytics/throughput/", enforce_plant_access(analytics_throughput), name="analytics_throughput"),
    path("analytics/queue-distribution/", enforce_plant_access(analytics_queue_distribution), name="analytics_queue_distribution"),
    path("analytics/product-volume/", enforce_plant_access(analytics_product_volume), name="analytics_product_volume"),
    path("analytics/avg-time-by-truck-type/", enforce_plant_access(analytics_avg_time_by_truck_type), name="analytics_avg_time_by_truck_type"),
    path("analytics/notification-summary/", enforce_plant_access(analytics_notification_summary), name="analytics_notification_summary"),
]
