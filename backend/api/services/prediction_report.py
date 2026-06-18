"""Prediction accuracy report — predicted vs actual loading times for today's trucks."""

from __future__ import annotations

import math

from ..constants import PLANT_NAME
from ..utils.date_ranges import get_date_range, get_today_range, parse_datetime
from ..utils.db import fetch_all_dicts
from ..utils.sql_fragments import EFFECTIVE_DATE_CASE, QUEUE_TYPE_CASE
from .prediction import build_predictions
from .prediction_logger import build_model_filter, get_log_db_connection, resolve_car_type_label
from .truck_queues import get_truck_queues_data

_REPORT_SQL = f"""
    SELECT
        TruckSeqNo AS sequence,
        TruckSeqNo AS truckSeqNo,
        PackListNo AS packListNo,
        CarNo AS licensePlate,
        {QUEUE_TYPE_CASE} AS queueType,
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

_READ_LOG_SQL = """
    SELECT
        [CarNo]              AS licensePlate,
        [CarType]            AS carType,
        [PickListType]       AS queueType,
        [OperatorCarConfirm] AS operatorCarConfirm,
        [PostingTime]        AS postingTime,
        [PredictionTime]     AS predictedFinishTime,
        [PredictionErrorMin] AS errorMin,
        [Status]             AS status,
        [Model]              AS model,
        [Version]            AS version
    FROM [WMS].[dbo].[PredictionLog]
    WHERE PlantName = ?
      AND OperatorCarConfirm >= ?
      AND OperatorCarConfirm <= ?
      {model_filter}
    ORDER BY OperatorCarConfirm DESC;
"""

_MODELS_SQL = """
    SELECT
        [Model]   AS model,
        [Version] AS version,
        SUM(CASE WHEN [OperatorCarConfirm] >= ? AND [OperatorCarConfirm] <= ?
                 THEN 1 ELSE 0 END) AS n,
        MAX([OperatorCarConfirm]) AS lastUsed
    FROM [WMS].[dbo].[PredictionLog]
    WHERE PlantName = ?
      AND [Model] IS NOT NULL
    GROUP BY [Model], [Version]
    ORDER BY [Version] DESC, [Model] ASC;
"""


def _fmt_time(value) -> str | None:
    dt = parse_datetime(value)
    return dt.strftime("%H:%M:%S") if dt else None


def _fmt_datetime(value) -> str | None:
    """Full ISO timestamp — used for multi-day ranges so date is unambiguous and rows stay sortable."""
    dt = parse_datetime(value)
    return dt.strftime("%Y-%m-%d %H:%M:%S") if dt else None


def _fetch_trucks_with_predictions(start_dt, end_dt) -> tuple[list[dict], list]:
    """Fetch trucks from vwTimeStampDashbaord and run ML predictions — shared by all callers."""
    trucks = fetch_all_dicts(_REPORT_SQL, [PLANT_NAME, start_dt, end_dt])
    # Use the live active queue (same data as dashboard) for queue state features
    # so predictions match what the dashboard shows for the same truck.
    predictions = build_predictions(trucks, queue_trucks=get_truck_queues_data())
    return trucks, predictions


def _error_rows_from_pairs(trucks: list[dict], predictions: list) -> list[dict]:
    """Project truck+prediction pairs into slim error rows for metrics computation."""
    rows = []
    for truck, pred in zip(trucks, predictions):
        posting_time = truck.get("postingTime")
        if not posting_time or not pred:
            continue
        pred_finish = pred.get("predictedFinishTime")
        if not pred_finish:
            continue
        actual_dt = parse_datetime(posting_time)
        pred_dt = parse_datetime(pred_finish)
        if not actual_dt or not pred_dt:
            continue
        rows.append({
            "operatorCarConfirm": truck.get("operatorCarConfirm"),
            "errorMin": round((actual_dt - pred_dt).total_seconds() / 60.0, 1),
            "actualTotalTimeMin": truck.get("actualTotalTimeMin"),
        })
    return rows


def _build_report(trucks: list[dict], predictions: list) -> dict:
    rows = []
    errors: list[float] = []

    for truck, pred in zip(trucks, predictions):
        seq = truck.get("truckSeqNo") or truck.get("sequence")
        pred_min = pred["predictedTotalTimeMin"] if pred else None
        pred_finish = pred["predictedFinishTime"] if pred else None
        posting_time = truck.get("postingTime")
        is_completed = posting_time is not None

        error_min = None
        actual_finish_dt = parse_datetime(posting_time)
        pred_finish_dt = parse_datetime(pred_finish)
        if actual_finish_dt and pred_finish_dt:
            error_min = round((actual_finish_dt - pred_finish_dt).total_seconds() / 60.0, 1)
            errors.append(abs(error_min))

        rows.append({
            "sequence": seq,
            "licensePlate": truck.get("licensePlate"),
            "carType": resolve_car_type_label(truck.get("rawCarType")),
            "queueType": truck.get("queueType"),
            "arrivalTime": _fmt_time(truck.get("operatorCarConfirm")),
            "predictedFinishTime": _fmt_time(pred_finish),
            "predictedTotalTimeMin": pred_min,
            "actualFinishTime": _fmt_time(posting_time) if is_completed else None,
            "actualTotalTimeMin": truck.get("actualTotalTimeMin"),
            "errorMin": error_min,
            "isCompleted": is_completed,
            "status": "เสร็จแล้ว" if is_completed else truck.get("queueType", "-"),
        })

    return {
        "trucks": rows,
        "metrics": _compute_metrics(errors),
        "total": len(rows),
        "completed": sum(1 for r in rows if r["isCompleted"]),
    }


def get_prediction_report_data() -> dict:
    start_dt, end_dt = get_today_range()
    trucks, predictions = _fetch_trucks_with_predictions(start_dt, end_dt)
    return _build_report(trucks, predictions)


def get_live_error_rows(preset: str = "today", date_from: str = None, date_to: str = None) -> list[dict]:
    """คืน error ต่อคันสำหรับรถที่เสร็จแล้ว — ใช้คำนวณ metrics timeseries แบบ live."""
    start_dt, end_dt = get_date_range(preset, date_from, date_to)
    trucks, predictions = _fetch_trucks_with_predictions(start_dt, end_dt)
    return _error_rows_from_pairs(trucks, predictions)


def get_all_today_trucks_with_predictions() -> list[dict]:
    """Fetch all today's trucks (including completed) with predictions — used by background logger."""
    start_dt, end_dt = get_today_range()
    trucks, predictions = _fetch_trucks_with_predictions(start_dt, end_dt)

    return [
        {
            "packListNo": truck.get("packListNo", ""),
            "licensePlate": truck.get("licensePlate", ""),
            "carType": resolve_car_type_label(truck.get("rawCarType")),
            "queueType": truck.get("queueType") or "-",
            "operatorCarConfirm": truck.get("operatorCarConfirm"),
            "postingTime": truck.get("postingTime"),
            "predictedFinishTime": pred.get("predictedFinishTime"),
        }
        for truck, pred in zip(trucks, predictions)
        if pred is not None and pred.get("predictedFinishTime")
    ]


def get_prediction_log_data(
    preset: str = "today",
    date_from: str = None,
    date_to: str = None,
    model: str = None,
    version=None,
) -> dict:
    """Read predictions from PredictionLog for the given date range — no live ML computation.

    When `model` (and optionally `version`) is given, only that model's rows are returned.
    """
    start_dt, end_dt = get_date_range(preset, date_from, date_to)
    model_clause, model_params = build_model_filter(model, version)
    sql = _READ_LOG_SQL.format(model_filter=model_clause)
    conn = get_log_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql, [PLANT_NAME, start_dt, end_dt, *model_params])
        columns = [col[0] for col in cursor.description]
        db_rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
    finally:
        conn.close()

    rows = []
    abs_errors: list[float] = []

    # ช่วงย้อนหลังครอบหลายวัน — แสดงวันที่เต็มเพื่อไม่ให้กำกวม (และ ISO ทำให้ frontend sort ตามเวลาจริง)
    fmt = _fmt_time if preset == "today" else _fmt_datetime

    for i, r in enumerate(db_rows, start=1):
        posting_time = r.get("postingTime")
        is_completed = posting_time is not None
        error_min = r.get("errorMin")

        if error_min is not None:
            abs_errors.append(abs(float(error_min)))

        rows.append({
            "sequence": i,
            "licensePlate": r.get("licensePlate"),
            "carType": r.get("carType") or "-",
            "queueType": r.get("queueType") or "-",
            "arrivalTime": fmt(r.get("operatorCarConfirm")),
            "predictedFinishTime": fmt(r.get("predictedFinishTime")),
            "actualFinishTime": fmt(posting_time) if is_completed else None,
            "errorMin": float(error_min) if error_min is not None else None,
            "isCompleted": is_completed,
            "status": "เสร็จแล้ว" if is_completed else "กำลังดำเนินการ",
            "model": r.get("model"),
            "version": float(r["version"]) if r.get("version") is not None else None,
        })

    return {
        "trucks": rows,
        "metrics": _compute_metrics(abs_errors),
        "total": len(rows),
        "completed": sum(1 for r in rows if r["isCompleted"]),
    }


def get_prediction_models(preset: str = "today", date_from: str = None, date_to: str = None) -> dict:
    """Distinct (Model, Version) pairs logged in PredictionLog — drives the model dropdown.

    `n` = จำนวนแถวของโมเดลนั้น *ภายในช่วงวันที่ที่เลือก* (0 = ไม่ได้ใช้ในช่วงนี้ →
    frontend แสดงเป็นตัวเลือกที่กดไม่ได้). คืนทุกโมเดลที่เคยมีเสมอ เพื่อให้เห็นว่ามีอะไรบ้าง.
    """
    start_dt, end_dt = get_date_range(preset, date_from, date_to)
    conn = get_log_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(_MODELS_SQL, [start_dt, end_dt, PLANT_NAME])
        columns = [col[0] for col in cursor.description]
        db_rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
    finally:
        conn.close()

    models = []
    for r in db_rows:
        version = float(r["version"]) if r.get("version") is not None else None
        last_used_dt = parse_datetime(r.get("lastUsed"))
        models.append({
            "model": r.get("model"),
            "version": version,
            "n": r.get("n") or 0,
            "lastUsed": last_used_dt.strftime("%Y-%m-%d") if last_used_dt else None,
        })
    return {"models": models}


def _compute_metrics(abs_errors: list[float]) -> dict:
    if not abs_errors:
        return {"mae": None, "rmse": None, "accuracy15": None, "n": 0}

    n = len(abs_errors)
    mae = round(sum(abs_errors) / n, 2)
    rmse = round(math.sqrt(sum(e ** 2 for e in abs_errors) / n), 2)
    accuracy15 = round(sum(1 for e in abs_errors if e <= 15) / n * 100, 1)

    return {"mae": mae, "rmse": rmse, "accuracy15": accuracy15, "n": n}
