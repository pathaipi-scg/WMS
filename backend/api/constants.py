PLANT_NAME = "SB1"
PLANT_CODE = "COM20060001"
DEFAULT_FORKLIFT_ACTIVE_MINUTES = 5
DEFAULT_DASHBOARD_REFRESH_INTERVAL_SECONDS = 10
DEFAULT_DASHBOARD_CACHE_MAX_AGE_SECONDS = 10

# Realtime push intervals for the "today" view of the Predictions / Analytics pages.
# Prediction log data is only refreshed by the 2-minute logging job, so a 30s push is plenty.
# Analytics recomputes 5 aggregations per push, so it runs less often.
PREDICTIONS_SNAPSHOT_REFRESH_INTERVAL_SECONDS = 30
PREDICTIONS_SNAPSHOT_CACHE_MAX_AGE_SECONDS = 30
ANALYTICS_SNAPSHOT_REFRESH_INTERVAL_SECONDS = 60
ANALYTICS_SNAPSHOT_CACHE_MAX_AGE_SECONDS = 60

# A truck is "overtime" when total time (OperatorCarConfirm → PostingTime) exceeds this.
OVERTIME_THRESHOLD_MINUTES = 120
