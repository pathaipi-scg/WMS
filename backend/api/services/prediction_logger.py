"""Log ML prediction results to [WMS].[dbo].[PredictionLog]."""

from __future__ import annotations

import logging
from datetime import datetime

from ..utils.date_ranges import parse_datetime
from ..utils.log_db import get_log_db_connection  # re-exported for prediction_report
from .prediction import _CAR_TYPE_LABEL

logger = logging.getLogger(__name__)

_UPSERT_SQL = """
MERGE [WMS].[dbo].[PredictionLog] AS tgt
USING (VALUES (?,?,?,?,?,?,?,?,?,?,?,?)) AS src
    (PlantName, PackListNo, CarNo, CarType, PickListType,
     OperatorCarConfirm, PostingTime, PredictionTime, PredictionErrorMin, Status, Model, Version)
ON tgt.PackListNo = src.PackListNo
WHEN MATCHED AND (
    tgt.Status != src.Status
    OR (tgt.PostingTime IS NULL AND src.PostingTime IS NOT NULL)
    OR (tgt.PredictionTime != src.PredictionTime)
    OR ISNULL(tgt.Model, '') != ISNULL(src.Model, '')
    OR ISNULL(tgt.Version, -1) != ISNULL(src.Version, -1)
) THEN UPDATE SET
    PostingTime        = src.PostingTime,
    PredictionTime     = src.PredictionTime,
    PredictionErrorMin = src.PredictionErrorMin,
    Status             = src.Status,
    Model              = src.Model,
    Version            = src.Version
WHEN NOT MATCHED THEN INSERT
    (PlantName, PackListNo, CarNo, CarType, PickListType,
     OperatorCarConfirm, PostingTime, PredictionTime, PredictionErrorMin, Status, Model, Version)
  VALUES
    (src.PlantName, src.PackListNo, src.CarNo, src.CarType, src.PickListType,
     src.OperatorCarConfirm, src.PostingTime, src.PredictionTime,
     src.PredictionErrorMin, src.Status, src.Model, src.Version);
"""


def resolve_car_type_label(raw_car_type) -> str:
    """Convert raw CarType integer to display label (e.g. 10 → '10 ล้อ')."""
    try:
        return _CAR_TYPE_LABEL.get(int(raw_car_type), "อื่นๆ") if raw_car_type is not None else "-"
    except (TypeError, ValueError):
        return "-"


def build_model_filter(model: str | None, version=None) -> tuple[str, list]:
    """Build an optional `AND [Model] = ? AND [Version] = ?` clause + params.

    Returns ("", []) when no model is selected (i.e. "all models").
    Shared by prediction_report and prediction_metrics so the filter stays consistent.
    """
    clause = ""
    params: list = []
    if model:
        clause += " AND [Model] = ?"
        params.append(model)
    if version not in (None, ""):
        try:
            params.append(float(version))
            clause += " AND [Version] = ?"
        except (TypeError, ValueError):
            pass
    return clause, params


def _upsert_rows(rows: list[tuple]) -> None:
    conn = get_log_db_connection()
    try:
        with conn:
            conn.cursor().executemany(_UPSERT_SQL, rows)
    except Exception:
        logger.exception("Failed to upsert prediction log rows")
    finally:
        conn.close()


def log_predictions(plant_name: str, trucks: list[dict]) -> None:
    """Upsert predictions for all trucks that have a predictedFinishTime."""
    # Resolve the active model framework + version once (e.g. "LightGBM", 2.0).
    try:
        from ..ml.predictor_singleton import get_predictor
        predictor = get_predictor()
        model_name = predictor.model_name
        model_version = predictor.version
    except Exception:
        model_name = None
        model_version = None

    rows: list[tuple] = []

    for truck in trucks:
        pred_finish_raw = truck.get("predictedFinishTime")
        if not pred_finish_raw:
            continue

        occ = parse_datetime(truck.get("operatorCarConfirm"))
        pred_finish = parse_datetime(pred_finish_raw)
        if occ is None or pred_finish is None:
            continue

        posting_time = parse_datetime(truck.get("postingTime"))
        error_min: float | None = None
        if posting_time is not None:
            error_min = round((posting_time - pred_finish).total_seconds() / 60.0, 1)

        car_type = truck.get("carType") or resolve_car_type_label(truck.get("rawCarType"))

        rows.append((
            plant_name,
            truck.get("packListNo", ""),
            truck.get("licensePlate", ""),
            car_type,
            truck.get("queueType") or "-",
            occ,
            posting_time,
            pred_finish,
            error_min,
            "completed" if posting_time is not None else "in_progress",
            model_name,
            model_version,
        ))

    if rows:
        _upsert_rows(rows)
