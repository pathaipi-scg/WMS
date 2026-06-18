"""Prediction metric trends over time — MAE / RMSE / R² per time bucket.

Today: computed live from vwTimeStampDashbaord (same source as KPI cards).
Historical: read from PredictionLog (queue state at prediction time is already logged).
"""

from __future__ import annotations

import math
from collections import defaultdict

from ..constants import PLANT_NAME
from ..utils.date_ranges import get_date_range, parse_datetime
from .prediction_logger import build_model_filter, get_log_db_connection

# residual = PredictionErrorMin (actual_total − predicted_total, นาที)
# actual_total = DATEDIFF(MINUTE, OperatorCarConfirm, PostingTime)
#   MAE     = AVG(|residual|)
#   RMSE    = SQRT(AVG(residual²))
#   ss_res  = Σ residual²
#   var_actual = VARP(actual_total)  →  ss_tot = var_actual · n
#   R²      = 1 − ss_res / ss_tot       (คำนวณใน Python เพื่อ guard ค่าขอบ)
_TIMESERIES_SQL = """
    SELECT
        {period_select} AS periodKey,
        COUNT(*)                                  AS n,
        AVG(ABS([PredictionErrorMin]))            AS mae,
        SQRT(AVG(POWER([PredictionErrorMin], 2))) AS rmse,
        AVG(CASE WHEN ABS([PredictionErrorMin]) <= 15 THEN 1.0 ELSE 0.0 END) * 100 AS accuracy
    FROM [WMS].[dbo].[PredictionLog]
    WHERE PlantName = ?
      AND [OperatorCarConfirm] >= ?
      AND [OperatorCarConfirm] <= ?
      AND [PostingTime] IS NOT NULL
      AND [PredictionErrorMin] IS NOT NULL
      {model_filter}
    GROUP BY {period_group}
    ORDER BY {period_group} ASC;
"""

_HOUR_EXPR = "DATEPART(HOUR, [OperatorCarConfirm])"
_DAY_EXPR = "CAST([OperatorCarConfirm] AS DATE)"

_OVERALL_SQL = """
    SELECT
        COUNT(*)                                  AS n,
        AVG(ABS([PredictionErrorMin]))            AS mae,
        SQRT(AVG(POWER([PredictionErrorMin], 2))) AS rmse,
        AVG(CASE WHEN ABS([PredictionErrorMin]) <= 15 THEN 1.0 ELSE 0.0 END) * 100 AS accuracy
    FROM [WMS].[dbo].[PredictionLog]
    WHERE PlantName = ?
      AND [OperatorCarConfirm] >= ?
      AND [OperatorCarConfirm] <= ?
      AND [PostingTime] IS NOT NULL
      AND [PredictionErrorMin] IS NOT NULL
      {model_filter};
"""



def _overall_from_live(error_rows: list[dict]) -> dict:
    """คำนวณ MAE / RMSE / Accuracy รวมจาก error rows ทั้งหมดพร้อมกัน (ไม่ใช่ avg ของ bucket)."""
    errors = [r["errorMin"] for r in error_rows if r.get("errorMin") is not None]
    n = len(errors)
    if n == 0:
        return {"mae": None, "rmse": None, "accuracy": None, "n": 0}

    mae = round(sum(abs(e) for e in errors) / n, 2)
    rmse = round(math.sqrt(sum(e ** 2 for e in errors) / n), 2)
    accuracy = round(sum(1 for e in errors if abs(e) <= 15) / n * 100, 1)

    return {"mae": mae, "rmse": rmse, "accuracy": accuracy, "n": n}


def _overall_from_log(preset, date_from, date_to, model=None, version=None) -> dict:
    """ดึง overall MAE / RMSE / R² จาก PredictionLog ด้วย query เดียว."""
    start_dt, end_dt = get_date_range(preset, date_from, date_to)
    model_clause, model_params = build_model_filter(model, version)
    sql = _OVERALL_SQL.format(model_filter=model_clause)
    conn = get_log_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql, [PLANT_NAME, start_dt, end_dt, *model_params])
        row = dict(zip([c[0] for c in cursor.description], cursor.fetchone() or []))
    finally:
        conn.close()

    n = row.get("n") or 0
    mae_raw = row.get("mae")
    rmse_raw = row.get("rmse")
    acc_raw = row.get("accuracy")
    return {
        "mae": round(float(mae_raw), 2) if mae_raw is not None else None,
        "rmse": round(float(rmse_raw), 2) if rmse_raw is not None else None,
        "accuracy": round(float(acc_raw), 1) if acc_raw is not None else None,
        "n": n,
    }


def _group_live_rows(error_rows: list[dict], group_by: str) -> list[dict]:
    """จัด group live error rows ตาม hour/day แล้วคำนวณ MAE / RMSE / R²."""
    is_hour = group_by == "hour"
    buckets: dict = defaultdict(list)

    for r in error_rows:
        occ = r.get("operatorCarConfirm")
        dt = occ if hasattr(occ, "hour") else parse_datetime(occ)
        if dt is None:
            continue
        key = dt.hour if is_hour else dt.date()
        buckets[key].append(r)

    data = []
    for key in sorted(buckets.keys()):
        bucket = buckets[key]
        errors = [r["errorMin"] for r in bucket if r.get("errorMin") is not None]
        n = len(errors)
        if n == 0:
            continue

        mae = round(sum(abs(e) for e in errors) / n, 2)
        rmse = round(math.sqrt(sum(e ** 2 for e in errors) / n), 2)
        accuracy = round(sum(1 for e in errors if abs(e) <= 15) / n * 100, 1)

        period = f"{int(key):02d}:00" if is_hour else str(key)
        data.append({"period": period, "mae": mae, "rmse": rmse, "accuracy": accuracy, "n": n})

    return data


def _fetch_log_rows(preset, date_from, date_to, group_by, model=None, version=None) -> list[dict]:
    start_dt, end_dt = get_date_range(preset, date_from, date_to)
    is_hour = group_by == "hour"
    expr = _HOUR_EXPR if is_hour else _DAY_EXPR
    model_clause, model_params = build_model_filter(model, version)
    sql = _TIMESERIES_SQL.format(period_select=expr, period_group=expr, model_filter=model_clause)

    conn = get_log_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql, [PLANT_NAME, start_dt, end_dt, *model_params])
        columns = [col[0] for col in cursor.description]
        db_rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
    finally:
        conn.close()

    data = []
    for r in db_rows:
        key = r.get("periodKey")
        period = f"{int(key):02d}:00" if is_hour else str(key)
        mae = r.get("mae")
        rmse = r.get("rmse")
        acc_raw = r.get("accuracy")
        data.append({
            "period": period,
            "mae": round(float(mae), 2) if mae is not None else None,
            "rmse": round(float(rmse), 2) if rmse is not None else None,
            "accuracy": round(float(acc_raw), 1) if acc_raw is not None else None,
            "n": r.get("n"),
        })
    return data


def get_prediction_metrics_timeseries(
    preset: str = "today",
    group_by: str = "day",
    date_from: str = None,
    date_to: str = None,
    model: str = None,
    version=None,
) -> dict:
    """MAE / RMSE / R² ต่อช่วงเวลา (รายชั่วโมง/รายวัน).

    วันนี้: คำนวณ live จาก vwTimeStampDashbaord (ตรงกับ KPI บนสุดเสมอ)
    ช่วงอื่น: อ่านจาก PredictionLog (queue state ณ เวลานั้นถูก log ไว้แล้ว)

    เมื่อเลือกโมเดล (`model`) จะอ่านจาก PredictionLog เสมอ เพราะ path live
    ไม่มีข้อมูลว่าแถวไหนมาจากโมเดลไหน (live = โมเดลปัจจุบันที่โหลดอยู่เท่านั้น)
    """
    use_live = preset == "today" and date_from is None and date_to is None and not model
    if use_live:
        from .prediction_report import get_live_error_rows
        error_rows = get_live_error_rows("today")
        data = _group_live_rows(error_rows, group_by)
        summary = _overall_from_live(error_rows)
    else:
        data = _fetch_log_rows(preset, date_from, date_to, group_by, model, version)
        summary = _overall_from_log(preset, date_from, date_to, model, version)

    return {"preset": preset, "group_by": group_by, "data": data, "summary": summary}
