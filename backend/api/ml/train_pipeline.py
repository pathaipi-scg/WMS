"""
Train and save the totaltime prediction model.

Usage:
    python -m src.models.train_pipeline            # use best params from notebook
    python -m src.models.train_pipeline --tune     # re-run Optuna (~100 trials, slow)
    python -m src.models.train_pipeline --tune --n-trials 50
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import KFold

from src.utils.paths import MODELS_DIR, PROCESSED_DATA_DIR
from src.features.engineer import FEATURE_COLS, TARGET

logger = logging.getLogger(__name__)

RANDOM_STATE = 42

# Best hyperparameters from notebook Optuna search (XGBoost)
DEFAULT_PARAMS: dict = {
    "max_depth": 7,
    "learning_rate": 0.01157,
    "subsample": 0.8734,
    "colsample_bytree": 0.4711,
    "reg_alpha": 1.4269,
    "reg_lambda": 9.9946,
    "min_child_weight": 17,
    "gamma": 1.7531,
    "n_estimators": 802,
    "random_state": RANDOM_STATE,
    "n_jobs": -1,
    "verbosity": 0,
}


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def load_data() -> tuple[pd.DataFrame, pd.DataFrame]:
    train_path = PROCESSED_DATA_DIR / "train.csv"
    test_path  = PROCESSED_DATA_DIR / "test.csv"

    if not train_path.exists():
        raise FileNotFoundError(f"Train data not found: {train_path}")
    if not test_path.exists():
        raise FileNotFoundError(f"Test data not found: {test_path}")

    train_df = pd.read_csv(train_path, encoding="utf-8-sig")
    test_df  = pd.read_csv(test_path,  encoding="utf-8-sig")
    logger.info("Loaded train=%d rows, test=%d rows", len(train_df), len(test_df))
    return train_df, test_df


def prepare_xy(
    df: pd.DataFrame,
    feature_cols: list[str],
) -> tuple[pd.DataFrame, pd.Series]:
    cols = [c for c in feature_cols if c in df.columns]
    X = df[cols].select_dtypes(include="number").copy()
    y = df[TARGET].copy()
    return X, y


# ---------------------------------------------------------------------------
# Hyperparameter tuning
# ---------------------------------------------------------------------------

def tune_xgboost(X_train: pd.DataFrame, y_train: pd.Series, n_trials: int = 100) -> dict:
    import optuna
    optuna.logging.set_verbosity(optuna.logging.WARNING)

    cv = KFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)

    def objective(trial):
        params = {
            "n_estimators": 2000,
            "max_depth":          trial.suggest_int("max_depth", 3, 7),
            "learning_rate":      trial.suggest_float("learning_rate", 0.005, 0.08, log=True),
            "subsample":          trial.suggest_float("subsample", 0.6, 1.0),
            "colsample_bytree":   trial.suggest_float("colsample_bytree", 0.4, 0.9),
            "reg_alpha":          trial.suggest_float("reg_alpha", 0.1, 10.0, log=True),
            "reg_lambda":         trial.suggest_float("reg_lambda", 1.0, 15.0, log=True),
            "min_child_weight":   trial.suggest_int("min_child_weight", 5, 20),
            "gamma":              trial.suggest_float("gamma", 0.0, 2.0),
            "early_stopping_rounds": 40,
            "random_state": RANDOM_STATE,
            "n_jobs": -1,
            "verbosity": 0,
        }
        scores, best_iters = [], []
        for tr_idx, val_idx in cv.split(X_train):
            X_tr, X_val = X_train.iloc[tr_idx], X_train.iloc[val_idx]
            y_tr, y_val = y_train.iloc[tr_idx], y_train.iloc[val_idx]
            m = xgb.XGBRegressor(**params)
            m.fit(X_tr, y_tr, eval_set=[(X_val, y_val)], verbose=False)
            scores.append(np.sqrt(mean_squared_error(y_val, m.predict(X_val))))
            best_iters.append(m.best_iteration)
        trial.set_user_attr("best_iteration", int(np.mean(best_iters)))
        return np.mean(scores)

    study = optuna.create_study(
        direction="minimize",
        sampler=optuna.samplers.TPESampler(seed=RANDOM_STATE),
    )
    study.optimize(objective, n_trials=n_trials, show_progress_bar=True)

    best = study.best_params.copy()
    best["n_estimators"] = study.best_trial.user_attrs["best_iteration"] + 1
    best.update({"random_state": RANDOM_STATE, "n_jobs": -1, "verbosity": 0})
    logger.info("Best Optuna params: %s", best)
    return best


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------

def evaluate(model, X: pd.DataFrame, y: pd.Series, split: str) -> dict:
    pred = model.predict(X)
    return {
        "split": split,
        "mae":   round(float(mean_absolute_error(y, pred)), 4),
        "rmse":  round(float(np.sqrt(mean_squared_error(y, pred))), 4),
        "r2":    round(float(r2_score(y, pred)), 4),
    }


# ---------------------------------------------------------------------------
# Save artifacts
# ---------------------------------------------------------------------------

def save_artifacts(
    model,
    feature_cols: list[str],
    train_medians: dict,
    cartype_avg_map: dict,
    rolling_median_by_cartype: dict,
    global_rolling_mean: float,
    metrics: dict,
) -> None:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    model_path = MODELS_DIR / "best_model_totaltime.joblib"
    joblib.dump(model, model_path)
    logger.info("Model saved -> %s", model_path)

    metadata = {
        "feature_cols": feature_cols,
        "train_medians": {str(k): v for k, v in train_medians.items()},
        "cartype_avg_map": {str(k): v for k, v in cartype_avg_map.items()},
        "rolling_median_by_cartype": {str(k): v for k, v in rolling_median_by_cartype.items()},
        "global_rolling_mean": global_rolling_mean,
        "model_type": "XGBoost",
        "metrics": metrics,
    }
    meta_path = MODELS_DIR / "feature_metadata.json"
    meta_path.write_text(json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8")
    logger.info("Metadata saved -> %s", meta_path)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)s  %(message)s",
        datefmt="%H:%M:%S",
    )

    parser = argparse.ArgumentParser(description="Train totaltime prediction model")
    parser.add_argument("--tune",     action="store_true", help="Run Optuna tuning (slow)")
    parser.add_argument("--n-trials", type=int, default=100, help="Optuna trial count")
    args = parser.parse_args()

    # --- Load ---
    train_df, test_df = load_data()

    X_train, y_train = prepare_xy(train_df, FEATURE_COLS)
    X_test,  y_test  = prepare_xy(test_df,  FEATURE_COLS)

    feature_cols  = X_train.columns.tolist()
    train_medians = X_train.median(numeric_only=True).to_dict()

    X_train = X_train.fillna(pd.Series(train_medians))
    X_test  = X_test.fillna(pd.Series(train_medians))

    # Inference-time fallback stats
    cartype_avg_map = (
        train_df.groupby("CarType")[TARGET].mean().round(2).to_dict()
    )
    rolling_median_by_cartype = (
        train_df.groupby("CarType")["rolling_avg_cartype_last10"]
        .median().round(2).to_dict()
        if "rolling_avg_cartype_last10" in train_df.columns
        else {}
    )
    global_rolling_mean = round(float(
        train_df["rolling_avg_time_last5"].median()
        if "rolling_avg_time_last5" in train_df.columns
        else y_train.mean()
    ), 2)

    # --- Train ---
    if args.tune:
        logger.info("Running Optuna with %d trials ...", args.n_trials)
        params = tune_xgboost(X_train, y_train, n_trials=args.n_trials)
    else:
        logger.info("Using default (notebook) hyperparameters")
        params = DEFAULT_PARAMS.copy()

    logger.info("Training XGBoost ...")
    model = xgb.XGBRegressor(**params)
    model.fit(X_train, y_train)

    # --- Evaluate ---
    train_metrics = evaluate(model, X_train, y_train, "train")
    test_metrics  = evaluate(model, X_test,  y_test,  "test")
    logger.info("Train | MAE=%.2f  RMSE=%.2f  R2=%.3f",
             train_metrics["mae"], train_metrics["rmse"], train_metrics["r2"])
    logger.info("Test  | MAE=%.2f  RMSE=%.2f  R2=%.3f",
             test_metrics["mae"],  test_metrics["rmse"],  test_metrics["r2"])

    # --- Save ---
    save_artifacts(
        model=model,
        feature_cols=feature_cols,
        train_medians=train_medians,
        cartype_avg_map=cartype_avg_map,
        rolling_median_by_cartype=rolling_median_by_cartype,
        global_rolling_mean=global_rolling_mean,
        metrics={"train": train_metrics, "test": test_metrics},
    )
    logger.info("Done.")


if __name__ == "__main__":
    main()
