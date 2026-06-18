"""
Inference pipeline for the totaltime prediction model.

Programmatic usage:
    from src.pipeline.predict import Predictor

    predictor = Predictor()   # load model once

    # Single record (dict input)
    result = predictor.predict_single({
        'PlantName': 'SB1',
        'CarType': 3.0,
        'PickListType': 1.0,
        'PrepareForward': 0.0,
        'OperatorCarConfirm': '2026-05-19 08:30:00',
        'total_tile_amount': 5000.0,
        'total_fitting_amount': 0.0,
        'total_accessories_amount': 0.0,
        # Optional — supply from live WMS; uses train medians if omitted
        'queue_waiting': 2,
        'queue_loading': 3,
    })
    print(result['predicted_total_time_min'])   # e.g. 38.5

    # Batch (CSV file)
    result_df = predictor.predict_batch('data/raw/new_trucks.csv', 'predictions.csv')

CLI usage:
    python -m api.ml.predict --input data/raw/new_trucks.csv --output predictions.csv
"""

from __future__ import annotations

import argparse
import json
import logging
import re
from pathlib import Path
from typing import Union

import joblib
import numpy as np
import pandas as pd

from .engineer import FEATURE_COLS, engineer_inference_features

MODELS_DIR = Path(__file__).resolve().parents[2] / "model"

logger = logging.getLogger(__name__)


class Predictor:
    """
    Loads model + feature metadata once and exposes predict_single() / predict_batch().
    Designed to be instantiated once and reused (e.g., as a Django app singleton).
    """

    def __init__(
        self,
        model_path: Union[str, Path] = MODELS_DIR / "Model_V.2.joblib",
        metadata_path: Union[str, Path] = MODELS_DIR / "feature_metadata.json",
    ) -> None:
        model_path    = Path(model_path)
        metadata_path = Path(metadata_path)

        if not model_path.exists():
            raise FileNotFoundError(
                f"Model not found: {model_path}\n"
                "Run: python -m src.models.train_pipeline"
            )
        if not metadata_path.exists():
            raise FileNotFoundError(
                f"Metadata not found: {metadata_path}\n"
                "Run: python -m src.models.train_pipeline"
            )

        self.model = joblib.load(model_path)
        print("=" * 50)
        print("MODEL TYPE:", type(self.model))
        print("MODEL MODULE:", type(self.model).__module__)
        print("=" * 50)
        meta = json.loads(metadata_path.read_text(encoding="utf-8"))

        # Identify the model from the loaded object (not metadata, which is shared
        # across versions and can be stale, e.g. "XGBoost" even for a LightGBM file).
        module = type(self.model).__module__.split(".")[0]
        self.framework: str = {
            "xgboost": "XGBoost",
            "lightgbm": "LightGBM",
        }.get(module, module)
        # Numeric version parsed from the file name (e.g. "Model_V.2" -> 2.0),
        # stored in PredictionLog.Version (float). None if no number is present.
        stem = Path(model_path).stem
        m = re.search(r"[vV]\.?(\d+(?:\.\d+)?)", stem)
        self.version: float | None = float(m.group(1)) if m else None
        # Framework name stored in PredictionLog.Model (varchar(50)).
        self.model_name: str = self.framework[:50]
        # Human-readable label for logging only.
        self.model_label: str = self.framework + (f" v{self.version}" if self.version is not None else "")

        self.feature_cols: list[str] = meta["feature_cols"]
        self.train_medians: dict     = {k: float(v) for k, v in meta["train_medians"].items()}
        self.cartype_avg_map: dict   = {float(k): float(v) for k, v in meta["cartype_avg_map"].items()}
        self.rolling_fallback_cartype: dict = {
            float(k): float(v) for k, v in meta["rolling_median_by_cartype"].items()
        }
        self.rolling_fallback_mean: float = float(meta["global_rolling_mean"])

        logger.info(
            "Predictor ready | model=%s | features=%d",
            self.model_label,
            len(self.feature_cols),
        )

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _build_features(self, df_raw: pd.DataFrame) -> pd.DataFrame:
        df_feat = engineer_inference_features(
            df_raw=df_raw,
            cartype_avg_map=self.cartype_avg_map,
            rolling_fallback_mean=self.rolling_fallback_mean,
            rolling_fallback_cartype=self.rolling_fallback_cartype,
        )

        # Ensure all expected columns exist (fill missing with train medians)
        for col in self.feature_cols:
            if col not in df_feat.columns:
                df_feat[col] = np.nan

        X = df_feat[self.feature_cols].copy()

        # Coerce any object-dtype columns (None / string) to numeric before fillna
        # so XGBoost receives only int/float columns.
        obj_cols = X.select_dtypes(include="object").columns
        if len(obj_cols):
            X[obj_cols] = X[obj_cols].apply(pd.to_numeric, errors="coerce")

        X = X.fillna(pd.Series(self.train_medians))
        return X

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def predict_single(self, record: dict) -> dict:
        """
        Predict loading time for one truck record.

        Args:
            record: dict with raw truck data fields.
                    Queue fields (queue_waiting, queue_loading) are optional
                    — train-set medians are used if not provided.

        Returns:
            Input dict enriched with 'predicted_total_time_min' (float, minutes).
        """
        df_raw = pd.DataFrame([record])
        X = self._build_features(df_raw)
        pred = float(self.model.predict(X)[0])
        return {**record, "predicted_total_time_min": round(pred, 2)}

    def predict_batch(
        self,
        input_path: Union[str, Path],
        output_path: Union[str, Path, None] = None,
    ) -> pd.DataFrame:
        """
        Predict for all records in a CSV file.

        Args:
            input_path:  Path to raw input CSV (same schema as interim clean CSV).
            output_path: If provided, saves result CSV to this path.

        Returns:
            DataFrame with original columns + 'predicted_total_time_min'.
        """
        df_raw = pd.read_csv(input_path, encoding="utf-8-sig")
        logger.info("Loaded %d records from %s", len(df_raw), input_path)

        X = self._build_features(df_raw)
        preds = self.model.predict(X)

        result = df_raw.copy()
        result["predicted_total_time_min"] = np.round(preds, 2)

        if output_path is not None:
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            result.to_csv(output_path, index=False, encoding="utf-8-sig")
            logger.info("Predictions saved -> %s", output_path)

        return result

    def predict_from_processed(self, df: pd.DataFrame) -> np.ndarray:
        """
        Predict from already-engineered (processed) DataFrame.
        Useful for quick evaluation without re-running feature engineering.
        """
        cols = [c for c in self.feature_cols if c in df.columns]
        X = df[cols].fillna(pd.Series(self.train_medians))
        return self.model.predict(X)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)s  %(message)s",
        datefmt="%H:%M:%S",
    )

    parser = argparse.ArgumentParser(description="Predict truck loading time from CSV")
    parser.add_argument("--input",  required=True, help="Path to raw input CSV")
    parser.add_argument("--output", default=None,  help="Path to save predictions CSV")
    args = parser.parse_args()

    predictor = Predictor()
    result = predictor.predict_batch(args.input, args.output)

    print(f"\nPredictions (n={len(result)}):")
    print(result["predicted_total_time_min"].describe().round(2).to_string())

    if args.output is None:
        print("\nSample output (first 5 rows):")
        print(result[["predicted_total_time_min"]].head().to_string())


if __name__ == "__main__":
    main()
