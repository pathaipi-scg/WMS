"""Prediction accuracy report — predicted vs actual loading times for today's trucks."""

from __future__ import annotations

import logging
import math
from datetime import datetime

from ..constants import PLANT_NAME
from ..utils.date_ranges import get_today_range
from ..utils.db import fetch_all_dicts
from ..utils.sql_fragments import EFFECTIVE_DATE_CASE
from .prediction import _CAR_TYPE_LABEL, build_predictions
from .truck_queues import get_truck_queues_data

log = logging.getLogger(__name__)

_REPORT_SQL = f"""
    SELECT
        TruckSeqNo AS sequence,
        TruckSeqNo AS truckSeqNo,
        CarNo AS licensePlate,
        CASE
            WHEN LTRIM(RTRIM(PickListType)) = 'SmartQ' THEN N'SmartQ'
            WHEN LTRIM(RTRIM(PickListType)) = 'Walk-in' AND ISNULL(PrepareForward, 'N') = 'N' THEN N'Walk in'
            WHEN LTRIM(RTRIM(PickListType)) = 'Walk-in' AND PrepareForward = 'Y' THEN N'ล่วงหน้า'
            ELSE N'-'
        END AS queueType,
        LTRIM(RTRIM(PickListType)) AS rawPickListType,
        ISNULL(PrepareForward, 'N') AS rawPrepareForward,
        CarType AS rawCarType,
        PostLocationName AS post_location_name,
        TruckStatus AS rawTruckStatus,
        OperatorCarConfirm AS operatorCarConfirm,
        CarConfirm AS carConfirm,
        FirstPostPallet AS firstPallet,
        LastPostPallet AS lastPostPallet,
        PostingTime AS postingTime,
        PackListStatus AS packListStatus,
        ISNULL(CPACTileSapAmount, 0) AS CPACTileSapAmount,
        ISNULL(PRESTIGETileSapAmount, 0) AS PRESTIGETileSapAmount,
        ISNULL(NEUSTILETileSapAmount, 0) AS NEUSTILETileSapAmount,
        ISNULL(CPACFittingSapAmount, 0) AS CPACFittingSapAmount,
        ISNULL(PRESTIGEFittingSapAmount, 0) AS PRESTIGEFittingSapAmount,
        ISNULL(NEUSTILEFittingSapAmount, 0) AS NEUSTILEFittingSapAmount,
        ISNULL(DURAFittingSapAmount, 0) AS DURAFittingSapAmount,
        ISNULL(ACCESSORIESSapAmount, 0) AS ACCESSORIESSapAmount,
        CASE
            WHEN PostingTime IS NOT NULL AND OperatorCarConfirm IS NOT NULL
                THEN DATEDIFF(SECOND, CAST(OperatorCarConfirm AS DATETIME), CAST(PostingTime AS DATETIME)) / 60.0
            ELSE NULL
        END AS actualTotalTimeMin
    FROM [OBM_DWMS].[dbo].[vwTimeStampDashbaord]
    WHERE PlantName = %s
    AND OperatorCarConfirm IS NOT NULL
    AND ({EFFECTIVE_DATE_CASE}) >= %s
    AND ({EFFECTIVE_DATE_CASE}) <= %s
    ORDER BY TruckSeqNo DESC;
"""


def _parse_dt(value) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value))
    except (ValueError, TypeError):
        return None


def _fmt_time(value) -> str | None:
    dt = _parse_dt(value)
    if dt is None:
        return None
    return dt.strftime("%H:%M:%S")


def get_prediction_report_data() -> dict:
    start_dt, end_dt = get_today_range()
    trucks = fetch_all_dicts(_REPORT_SQL, [PLANT_NAME, start_dt, end_dt])

    # Use the live active queue (same data as dashboard) for queue state features
    # so predictions match what the dashboard shows for the same truck.
    active_trucks = get_truck_queues_data()
    predictions = build_predictions(trucks, queue_trucks=active_trucks)

    rows = []
    errors: list[float] = []

    for truck, pred in zip(trucks, predictions):
        seq = truck.get("truckSeqNo") or truck.get("sequence")

        actual_min = truck.get("actualTotalTimeMin")
        pred_min = pred["predictedTotalTimeMin"] if pred else None
        pred_finish = pred["predictedFinishTime"] if pred else None

        actual_finish_dt = _parse_dt(truck.get("postingTime"))
        pred_finish_dt = _parse_dt(pred_finish)

        error_min = None
        if actual_finish_dt is not None and pred_finish_dt is not None:
            delta_sec = (actual_finish_dt - pred_finish_dt).total_seconds()
            error_min = round(delta_sec / 60.0, 1)
            errors.append(abs(error_min))

        posting_time = truck.get("postingTime")
        is_completed = posting_time is not None

        raw_car_type = truck.get("rawCarType")
        try:
            car_type_label = _CAR_TYPE_LABEL.get(int(raw_car_type), "อื่นๆ") if raw_car_type is not None else "-"
        except (TypeError, ValueError):
            car_type_label = "-"

        rows.append({
            "sequence": seq,
            "licensePlate": truck.get("licensePlate"),
            "carType": car_type_label,
            "queueType": truck.get("queueType"),
            "arrivalTime": _fmt_time(truck.get("operatorCarConfirm")),
            "predictedFinishTime": _fmt_time(pred_finish),
            "predictedTotalTimeMin": pred_min,
            "actualFinishTime": _fmt_time(posting_time) if is_completed else None,
            "actualTotalTimeMin": actual_min,
            "errorMin": error_min,
            "isCompleted": is_completed,
            "status": "เสร็จแล้ว" if is_completed else truck.get("queueType", "-"),
        })

    metrics = _compute_metrics(errors)

    return {
        "trucks": rows,
        "metrics": metrics,
        "total": len(rows),
        "completed": sum(1 for r in rows if r["isCompleted"]),
    }


def _compute_metrics(abs_errors: list[float]) -> dict:
    if not abs_errors:
        return {"mae": None, "rmse": None, "accuracy15": None, "n": 0}

    n = len(abs_errors)
    mae = round(sum(abs_errors) / n, 2)
    rmse = round(math.sqrt(sum(e ** 2 for e in abs_errors) / n), 2)
    accuracy15 = round(sum(1 for e in abs_errors if e <= 15) / n * 100, 1)

    return {"mae": mae, "rmse": rmse, "accuracy15": accuracy15, "n": n}
