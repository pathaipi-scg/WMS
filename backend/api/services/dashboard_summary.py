from ..constants import PLANT_NAME
from ..utils.date_ranges import get_today_range
from ..utils.db import fetch_scalar
from ..utils.sql_fragments import ACTIVE_PACK_STATUSES, EFFECTIVE_DATE_CASE, PACK_STATUS_OPERATOR_COMPLETED


def _get_base_range_params():
    start_dt, end_dt = get_today_range()
    return start_dt, end_dt, [PLANT_NAME, start_dt, end_dt]


def _query_count(sql: str) -> int:
    _, _, params = _get_base_range_params()
    return fetch_scalar(sql, params)


def get_total_trucks_count():
    return _query_count(f"""
        SELECT COUNT(TruckSeqNo)
        FROM [OBM_DWMS].[dbo].[vwTimeStampDashbaord]
        WHERE PlantName = %s
          AND PickDate >= %s
          AND PickDate <= %s
          AND PackListStatus IN (
                {ACTIVE_PACK_STATUSES},
                {PACK_STATUS_OPERATOR_COMPLETED}
          )
          AND (
                OperatorCarConfirm IS NOT NULL

                OR

                (
                    OperatorCarConfirm IS NULL
                    AND PickListType = 'Walk-in'
                    AND PrepareForward = 'n'
                    AND PickingTime IS NOT NULL
                )
          )
    """)


def get_waiting_queue_count():
    return _query_count(f"""
        SELECT COUNT(TruckSeqNo)
        FROM [OBM_DWMS].[dbo].[vwTimeStampDashbaord]
        WHERE PlantName = %s
          AND PackListStatus IN (
                {ACTIVE_PACK_STATUSES}
          )
          AND TruckStatus = 'Waiting'
          AND ({EFFECTIVE_DATE_CASE}) >= %s
          AND ({EFFECTIVE_DATE_CASE}) < %s
    """)


def get_loading_count():
    return _query_count(f"""
        SELECT COUNT(*)
        FROM [OBM_DWMS].[dbo].[vwTimeStampDashbaord]
        WHERE PlantName = %s
          AND PickDate >= %s
          AND PickDate < DATEADD(SECOND, 1, %s)
          AND PackListStatus IN (
                {ACTIVE_PACK_STATUSES}
          )
          AND OperatorCarConfirm IS NOT NULL
    """)


def get_completed_count():
    return _query_count(f"""
        SELECT COUNT(TruckSeqNo)
        FROM [OBM_DWMS].[dbo].[vwTimeStampDashbaord]
        WHERE PlantName = %s
          AND PickDate >= %s
          AND PickDate <= %s
          AND PackListStatus = {PACK_STATUS_OPERATOR_COMPLETED}
    """)


def get_overtime_trucks_count():
    return _query_count("""
        SELECT COUNT(*)
        FROM [OBM_DWMS].[dbo].[vwTimeStampDashbaord]
        WHERE PlantName = %s
          AND OperatorCarConfirm >= %s
          AND OperatorCarConfirm <= %s
          AND DATEDIFF(MINUTE, CAST(OperatorCarConfirm AS DATETIME), PostingTime) > 120
    """)


def get_dashboard_summary_data():
    start_dt, end_dt = get_today_range()

    return {
        "total_trucks": get_total_trucks_count(),
        "waiting_queue": get_waiting_queue_count(),
        "loading": get_loading_count(),
        "completed": get_completed_count(),
        "overtime_trucks": get_overtime_trucks_count(),
        "from": start_dt.strftime("%Y-%m-%d %H:%M:%S"),
        "to": end_dt.strftime("%Y-%m-%d %H:%M:%S"),
    }
