"""Batch prediction service — enriches truck queue records with ML predictions."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Feature encoding maps (must match values used during model training)
# ---------------------------------------------------------------------------

_CAR_TYPE_LABEL: dict[int, str] = {
    4: "4 ล้อ", 1000000008: "4 ล้อ",
    6: "6 ล้อ", 1000000003: "6 ล้อ",
    10: "10 ล้อ", 1000000000: "10 ล้อ", 1000000004: "10 ล้อ",
    18: "เทรเลอร์", 22: "เทรเลอร์", 1000000001: "เทรเลอร์",
    1000000002: "เทรเลอร์", 1000000005: "เทรเลอร์", 1000000006: "เทรเลอร์",
    1000000007: "เทรเลอร์", 1000000009: "เทรเลอร์",
    1000000010: "อื่นๆ",
}

_CAR_TYPE_ENCODE: dict[str, int] = {
    "4 ล้อ": 0, "6 ล้อ": 1, "10 ล้อ": 2, "เทรเลอร์": 3,
}

_PICK_LIST_ENCODE: dict[str, int] = {
    "Walk in": 0, "SmartQ": 1, "ล่วงหน้า": 2,
}

_PREPARE_FWD_ENCODE: dict[str, int] = {"N": 0, "Y": 1}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _encode_car_type(raw_car_type) -> int | None:
    try:
        label = _CAR_TYPE_LABEL.get(int(raw_car_type))
        if label is None:
            return None
        return _CAR_TYPE_ENCODE.get(label)
    except (TypeError, ValueError):
        return None


def _resolve_pick_list_label(raw_pick_list: str, raw_prepare_fwd: str) -> str | None:
    if raw_pick_list == "SmartQ":
        return "SmartQ"
    if raw_pick_list == "Walk-in":
        return "ล่วงหน้า" if raw_prepare_fwd == "Y" else "Walk in"
    return None


def _compute_live_queue_state(truck_list: list[dict]) -> dict:
    """Count queue/loading/closing trucks from the live truck list."""
    queue_waiting = 0
    queue_loading = 0
    queue_closing = 0

    for t in truck_list:
        status = (t.get("rawTruckStatus") or "").strip()
        last_post = t.get("lastPostPallet") or t.get("LastPostPallet")
        posting_time = t.get("postingTime") or t.get("PostingTime")

        if posting_time:
            # Truck has already exited — do not count in live queue state
            continue

        if status == "Waiting":
            queue_waiting += 1
        elif status == "Loading":
            if last_post:
                queue_closing += 1
            else:
                queue_loading += 1

    return {
        "queue_waiting": queue_waiting,
        "queue_loading": queue_loading,
        "queue_closing": queue_closing,
    }


def _build_ml_record(truck: dict, queue_state: dict) -> dict:
    """Convert a raw truck dict into an ML-ready feature dict."""
    raw_car_type = truck.get("rawCarType")
    raw_pick_list = (truck.get("rawPickListType") or "").strip()
    raw_prepare_fwd = (truck.get("rawPrepareForward") or "N").strip()

    pick_list_label = _resolve_pick_list_label(raw_pick_list, raw_prepare_fwd)

    return {
        "TruckSeqNo": truck.get("truckSeqNo") or truck.get("sequence"),
        "CarType": _encode_car_type(raw_car_type),
        "PickListType": _PICK_LIST_ENCODE.get(pick_list_label) if pick_list_label else None,
        "PrepareForward": _PREPARE_FWD_ENCODE.get(raw_prepare_fwd),
        "PostLocationName": None,  # mapping not stored — use train_median fallback
        "OperatorCarConfirm": truck.get("operatorCarConfirm") or truck.get("arrivalDate"),
        "CPACTileSapAmount": truck.get("CPACTileSapAmount", 0),
        "PRESTIGETileSapAmount": truck.get("PRESTIGETileSapAmount", 0),
        "NEUSTILETileSapAmount": truck.get("NEUSTILETileSapAmount", 0),
        "CPACFittingSapAmount": truck.get("CPACFittingSapAmount", 0),
        "PRESTIGEFittingSapAmount": truck.get("PRESTIGEFittingSapAmount", 0),
        "NEUSTILEFittingSapAmount": truck.get("NEUSTILEFittingSapAmount", 0),
        "DURAFittingSapAmount": truck.get("DURAFittingSapAmount", 0),
        "ACCESSORIESSapAmount": truck.get("ACCESSORIESSapAmount", 0),
        **queue_state,
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def _parse_occ(truck: dict):
    """Return OperatorCarConfirm as a datetime, or None."""
    raw = truck.get("operatorCarConfirm") or truck.get("arrivalDate")
    if not raw:
        return None
    return datetime.fromisoformat(raw) if isinstance(raw, str) else raw


def _assign_ml_seq(
    truck_list: list[dict],
    reference_trucks: list[dict] | None = None,
) -> list[int | None]:
    """
    Assign a global ML sequence number (1-based) per truck, ordered by
    OperatorCarConfirm ascending — matching the training convention where
    TruckSeqNo was the factory-arrival order, not the per-queue-type DB number.

    reference_trucks: if provided, ranks are computed from this full-day list so
    that active trucks get their correct day-level position even when truck_list
    contains only a subset (e.g. the live queue, which excludes completed trucks).
    """
    ref = reference_trucks if reference_trucks is not None else truck_list

    # Build occ → rank from the reference set
    ref_occs: list[datetime] = sorted(filter(None, (_parse_occ(t) for t in ref)))
    rank_map: dict[datetime, int] = {}
    for rank, occ in enumerate(ref_occs, start=1):
        rank_map.setdefault(occ, rank)  # first occurrence wins on ties

    return [rank_map.get(_parse_occ(t)) for t in truck_list]


def build_predictions(
    truck_list: list[dict],
    *,
    reference_trucks: list[dict] | None = None,
    queue_trucks: list[dict] | None = None,
) -> list[dict | None]:
    """
    Run ML predictions for all trucks that have OperatorCarConfirm.

    Returns a list of the same length as truck_list. Each element is either:
        { predictedTotalTimeMin, predictedFinishTime (ISO str) }  — when prediction succeeds
        None — when truck has no OperatorCarConfirm or prediction fails

    reference_trucks: optional full-day truck list (all today's trucks including
    completed) used only for computing the global TruckSeqNo rank.

    queue_trucks: optional list used to compute live queue state. Defaults to
    truck_list. Pass the active-only truck list so that the report page computes
    queue_waiting/loading/closing from the same source as the dashboard.
    """
    try:
        from ..ml.predictor_singleton import get_predictor
        predictor = get_predictor()
    except Exception:
        log.exception("Failed to load ML predictor — skipping predictions")
        return [None] * len(truck_list)

    active = queue_trucks if queue_trucks is not None else truck_list
    queue_state = _compute_live_queue_state(active)
    ml_seqs = _assign_ml_seq(truck_list, reference_trucks)
    results: list[dict | None] = []

    for truck, ml_seq in zip(truck_list, ml_seqs):
        occ_dt = _parse_occ(truck)
        if occ_dt is None:
            results.append(None)
            continue

        try:
            record = _build_ml_record(truck, queue_state)
            record["TruckSeqNo"] = ml_seq  # override with global arrival-order rank
            prediction = predictor.predict_single(record)
            predicted_min = prediction["predicted_total_time_min"]
            finish_dt = occ_dt + timedelta(minutes=predicted_min)

            results.append({
                "predictedTotalTimeMin": round(predicted_min, 1),
                "predictedFinishTime": finish_dt.isoformat(),
            })
        except Exception:
            log.exception("Prediction failed for truck index=%s", ml_seq)
            results.append(None)

    return results
