"""Django-aware singleton wrapper for the Predictor class."""

from __future__ import annotations

import logging
import threading
from pathlib import Path

logger = logging.getLogger(__name__)

_predictor = None
_lock = threading.Lock()

MODELS_DIR = Path(__file__).resolve().parents[2] / "model"


def get_predictor():
    """Return the module-level Predictor singleton, initialising it on first call."""
    global _predictor
    if _predictor is not None:
        return _predictor

    with _lock:
        if _predictor is not None:
            return _predictor

        from .predict import Predictor

        logger.info("Loading ML predictor from %s ...", MODELS_DIR)
        _predictor = Predictor(
            model_path=MODELS_DIR / "Model_V.2.joblib",
            metadata_path=MODELS_DIR / "feature_metadata.json",
        )
        logger.info("ML predictor ready.")

    return _predictor
