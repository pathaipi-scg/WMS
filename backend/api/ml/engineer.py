"""Feature engineering — shared by training pipeline and inference."""

from __future__ import annotations

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

TOTAL_BAYS = 10
QUEUE_CLOSING_CAP = 6

TIMESTAMP_COLS = [
    "PickDate", "QueueTime", "OperatorCarConfirm", "CarConfirm",
    "FirstPostPallet", "LastPostPallet", "PostingTime",
    "TileStart", "TileEnd", "FittingStart", "FittingEnd", "AccStart", "AccEnd",
]

TILE_COLS = ["CPACTileSapAmount", "PRESTIGETileSapAmount", "NEUSTILETileSapAmount"]
FITTING_COLS = [
    "CPACFittingSapAmount", "PRESTIGEFittingSapAmount",
    "NEUSTILEFittingSapAmount", "DURAFittingSapAmount",
]
AMOUNT_COLS = TILE_COLS + FITTING_COLS + ["ACCESSORIESSapAmount"]

TARGET = "total_time_min"

# Exact feature columns used by the trained model (matches processed/train.csv)
FEATURE_COLS = [
    "PickListType", "TruckSeqNo", "CarType", "PrepareForward", "PostLocationName",
    "hour", "day_of_week", "week_of_month", "month",
    "total_tile_amount", "total_fitting_amount", "total_accessories_amount",
    "total_sap_amount", "product_group_count",
    "queue_waiting", "queue_loading", "queue_closing", "total_queue", "available_bays",
    "sap_per_group", "queue_x_bays", "queue_x_sap",
    "rolling_avg_time_last5", "inter_arrival_min", "car_type_x_sap",
    "avg_time_by_cartype", "rolling_avg_cartype_last10",
]


# ---------------------------------------------------------------------------
# Step functions
# ---------------------------------------------------------------------------

def parse_timestamps(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    for col in TIMESTAMP_COLS:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce")
    return df


def add_calendar_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    occ = df["OperatorCarConfirm"]
    df["hour"] = occ.dt.hour
    df["day_of_week"] = occ.dt.dayofweek
    df["week_of_month"] = ((occ.dt.day - 1) // 7 + 1).astype("Int64")
    df["month"] = occ.dt.month
    return df


def add_product_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    present = [c for c in AMOUNT_COLS if c in df.columns]
    df[present] = df[present].apply(pd.to_numeric, errors="coerce").fillna(0)

    tile_present    = [c for c in TILE_COLS if c in df.columns]
    fitting_present = [c for c in FITTING_COLS if c in df.columns]

    df["total_tile_amount"]        = df[tile_present].sum(axis=1) if tile_present else 0
    df["total_fitting_amount"]     = df[fitting_present].sum(axis=1) if fitting_present else 0
    df["total_accessories_amount"] = df["ACCESSORIESSapAmount"] if "ACCESSORIESSapAmount" in df.columns else 0
    df["total_sap_amount"]         = df[present].sum(axis=1) if present else 0

    df["has_tile"]        = (df["total_tile_amount"] > 0).astype(int)
    df["has_fitting"]     = (df["total_fitting_amount"] > 0).astype(int)
    df["has_accessories"] = (df["total_accessories_amount"] > 0).astype(int)
    df["product_group_count"] = df[["has_tile", "has_fitting", "has_accessories"]].sum(axis=1)
    return df


def compute_queue_features(df: pd.DataFrame) -> pd.DataFrame:
    """Vectorized per-plant queue state at each truck's OperatorCarConfirm time."""
    df = df.sort_values("OperatorCarConfirm").reset_index(drop=True)

    for col in ["queue_waiting", "queue_loading", "queue_closing"]:
        df[col] = 0

    for _, grp in df.groupby("PlantName"):
        idx = grp.index.values

        occ = grp["OperatorCarConfirm"].values
        pt  = grp["PostingTime"].values
        cc  = grp["CarConfirm"].values
        fp  = grp["FirstPostPallet"].values
        lp  = grp["LastPostPallet"].values

        occ_s = np.sort(occ)
        pt_s  = np.sort(pt[~pd.isnull(pt)])
        cc_s  = np.sort(cc[~pd.isnull(cc)])
        fp_s  = np.sort(fp[~pd.isnull(fp)])
        lp_s  = np.sort(lp[~pd.isnull(lp)])

        entries   = np.searchsorted(occ_s, occ, side="left")
        cc_exits  = np.searchsorted(cc_s,  occ, side="right")
        fp_enters = np.searchsorted(fp_s,  occ, side="right")
        lp_enters = np.searchsorted(lp_s,  occ, side="right")
        pt_exits  = np.searchsorted(pt_s,  occ, side="right")

        df.loc[idx, "queue_waiting"] = entries   - cc_exits
        df.loc[idx, "queue_loading"] = fp_enters - lp_enters
        df.loc[idx, "queue_closing"] = lp_enters - pt_exits

    df["queue_loading"] = df["queue_loading"].clip(upper=TOTAL_BAYS)
    df["queue_closing"] = df["queue_closing"].clip(upper=QUEUE_CLOSING_CAP)
    df["total_queue"]   = df["queue_waiting"] + df["queue_loading"] + df["queue_closing"]
    df["available_bays"] = (TOTAL_BAYS - df["queue_loading"]).clip(lower=0)
    return df


def add_interaction_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["sap_per_group"] = (
        df["total_sap_amount"] / df["product_group_count"].replace(0, 1)
    ).round(2)
    df["queue_x_bays"] = (
        df["queue_waiting"] / df["available_bays"].clip(lower=1)
    ).round(4)
    df["queue_x_sap"] = (df["queue_waiting"] * df["total_sap_amount"]).round(2)
    df["car_type_x_sap"] = (df["CarType"] * df["total_sap_amount"]).round(2)
    return df


def add_rolling_features(df: pd.DataFrame, global_mean: float | None = None) -> pd.DataFrame:
    """Compute rolling time features — requires total_time_min (training path only)."""
    df = df.sort_values("OperatorCarConfirm").reset_index(drop=True)

    df["rolling_avg_time_last5"] = (
        df.groupby("PlantName")[TARGET]
        .transform(lambda x: x.shift(1).rolling(5, min_periods=1).mean())
        .round(2)
    )
    fill_val = global_mean if global_mean is not None else df[TARGET].mean()
    df["rolling_avg_time_last5"] = df["rolling_avg_time_last5"].fillna(fill_val).round(2)

    df["inter_arrival_min"] = (
        df.groupby("PlantName")["OperatorCarConfirm"]
        .transform(lambda x: x.diff().dt.total_seconds() / 60)
        .round(2)
    )
    median_arrival = df["inter_arrival_min"].median()
    df["inter_arrival_min"] = df["inter_arrival_min"].fillna(median_arrival).round(2)

    df["car_type_x_sap"] = (df["CarType"] * df["total_sap_amount"]).round(2)
    return df


def add_cartype_rolling(
    df: pd.DataFrame,
    cartype_avg_map: dict | None = None,
) -> pd.DataFrame:
    """Compute CarType-based rolling features — requires total_time_min (training path only)."""
    df = df.copy()
    if cartype_avg_map is None:
        cartype_avg = df.groupby("CarType")[TARGET].mean()
        cartype_avg_map = cartype_avg.to_dict()

    df["avg_time_by_cartype"] = df["CarType"].map(cartype_avg_map).round(2)

    df["rolling_avg_cartype_last10"] = (
        df.groupby("CarType")[TARGET]
        .transform(lambda x: x.shift(1).rolling(window=10, min_periods=1).mean())
        .round(2)
    )
    df["rolling_avg_cartype_last10"] = df["rolling_avg_cartype_last10"].fillna(
        df["avg_time_by_cartype"]
    )
    return df


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def engineer_inference_features(
    df_raw: pd.DataFrame,
    cartype_avg_map: dict,
    rolling_fallback_mean: float,
    rolling_fallback_cartype: dict,
) -> pd.DataFrame:
    """
    Feature engineering for inference — no target column required.

    Queue features (queue_waiting, queue_loading, queue_closing):
    - If the caller already provides these columns (from a live WMS system),
      they are used as-is.
    - If NOT provided and the batch contains multiple trucks with full
      timestamp columns, compute_queue_features() is called automatically.
    - For single-record prediction without queue state: train-set medians
      are applied later in Predictor._build_features().

    Rolling features (rolling_avg_time_last5, rolling_avg_cartype_last10):
    - Cannot be computed without target history, so training-set fallbacks
      are used (global median and per-CarType median from feature_metadata.json).
    """
    df = parse_timestamps(df_raw)
    df = add_calendar_features(df)
    df = add_product_features(df)

    # Queue: compute only if not already supplied and full context is available
    queue_cols_needed = {"queue_waiting", "queue_loading", "queue_closing"}
    has_queue = queue_cols_needed.issubset(df.columns)
    has_timestamps = all(c in df.columns for c in ("CarConfirm", "FirstPostPallet", "LastPostPallet", "PostingTime", "PlantName"))
    if not has_queue and has_timestamps:
        df = compute_queue_features(df)
    elif not has_queue:
        # will be filled with train medians downstream
        for col in ["queue_waiting", "queue_loading", "queue_closing", "total_queue", "available_bays"]:
            df[col] = np.nan

    if "total_queue" not in df.columns:
        df["total_queue"] = df.get("queue_waiting", 0) + df.get("queue_loading", 0) + df.get("queue_closing", 0)
    if "available_bays" not in df.columns:
        df["available_bays"] = (TOTAL_BAYS - df.get("queue_loading", 0)).clip(lower=0)

    df = add_interaction_features(df)

    # Rolling features: use fallback values (no target available)
    if "rolling_avg_time_last5" not in df.columns:
        df["rolling_avg_time_last5"] = rolling_fallback_mean
    if "inter_arrival_min" not in df.columns:
        if "PlantName" in df.columns and "OperatorCarConfirm" in df.columns:
            df["inter_arrival_min"] = (
                df.groupby("PlantName")["OperatorCarConfirm"]
                .transform(lambda x: x.diff().dt.total_seconds() / 60)
                .round(2)
            )
            df["inter_arrival_min"] = df["inter_arrival_min"].fillna(
                df["inter_arrival_min"].median()
            )
        else:
            df["inter_arrival_min"] = np.nan

    df["avg_time_by_cartype"] = df["CarType"].map(cartype_avg_map)
    if "rolling_avg_cartype_last10" not in df.columns:
        df["rolling_avg_cartype_last10"] = df["CarType"].map(rolling_fallback_cartype)

    return df
