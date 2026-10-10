"""Unsupervised sensor anomaly detection (Isolation Forest).

This module is independent of the RUL models. It does not write the RUL scaler
or overwrite ``models/baseline`` / ``models/lstm``.

Score interpretation
--------------------
Isolation Forest does **not** output a calibrated probability of failure.

* ``decision_score`` — sklearn ``decision_function``. Higher (more positive)
  means more consistent with the fitted training envelope. With the default
  contamination offset, values below 0 are Isolation Forest outliers.
* ``anomaly_score`` — ``-decision_score``. Higher means more unusual relative
  to the training envelope. Unbounded ranking score, not P(failure).
* ``max_abs_z`` — largest absolute standardized feature value after the
  training-only scaler. Complements Isolation Forest, which can miss
  single-channel spikes in higher dimensions.
* ``is_anomaly`` — ``True`` when Isolation Forest labels an outlier
  (``decision_score < 0``) **or** ``max_abs_z`` exceeds ``z_threshold``
  (default 6.0). Neither condition is a calibrated probability of failure.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Mapping

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from data_loader import MODELS_DIR, OP_SETTING_COLS, SENSOR_COLS
from preprocessing import DEFAULT_VAR_THRESHOLD, drop_near_zero_variance
from sensor_schema import canonical_sensor_key

ANOMALY_DIR = MODELS_DIR / "anomaly"
ANOMALY_BUNDLE_PATH = ANOMALY_DIR / "detector.joblib"

SCORE_DOC = (
    "anomaly_score is -IsolationForest.decision_function: higher means more "
    "unusual versus the fitted NASA FD001 training envelope. max_abs_z is the "
    "largest absolute standardized feature. is_anomaly is True if "
    "decision_score < 0 (Isolation Forest outlier) or max_abs_z exceeds "
    "z_threshold. None of these quantities is a calibrated probability of "
    "failure or remaining useful life."
)


def select_nominal_cycles(train: pd.DataFrame, cycle_cap: int = 50) -> pd.DataFrame:
    """Use early-life cycles as the nominal envelope (training file only)."""
    return train.loc[train["cycle"] <= cycle_cap].copy()


def readings_to_frame(readings: Mapping[str, Any] | pd.Series | pd.DataFrame) -> pd.DataFrame:
    """Normalize dict / Series / DataFrame input to a one-or-more-row frame."""
    if isinstance(readings, pd.DataFrame):
        return readings.copy()
    if isinstance(readings, pd.Series):
        return pd.DataFrame([readings.to_dict()])
    if not isinstance(readings, Mapping):
        raise TypeError("readings must be a mapping, Series, or DataFrame")
    row: dict[str, Any] = {}
    for key, value in readings.items():
        canon = canonical_sensor_key(str(key))
        if canon is not None:
            row[canon] = value
        elif key in OP_SETTING_COLS or key in ("unit_id", "cycle"):
            row[key] = value
        else:
            row[key] = value
    return pd.DataFrame([row])


class SensorAnomalyDetector:
    """Isolation Forest over scaled C-MAPSS operating settings + sensors."""

    def __init__(
        self,
        *,
        contamination: float = 0.02,
        random_state: int = 42,
        n_estimators: int = 200,
        cycle_cap: int = 50,
        var_threshold: float = DEFAULT_VAR_THRESHOLD,
        z_threshold: float = 6.0,
    ) -> None:
        self.contamination = contamination
        self.random_state = random_state
        self.n_estimators = n_estimators
        self.cycle_cap = cycle_cap
        self.var_threshold = var_threshold
        self.z_threshold = z_threshold
        self.scaler: StandardScaler | None = None
        self.model: IsolationForest | None = None
        self.feature_cols: list[str] = []
        self.fill_values: dict[str, float] = {}
        self.score_doc = SCORE_DOC

    def fit(self, train: pd.DataFrame) -> SensorAnomalyDetector:
        if train.empty:
            raise ValueError("Cannot fit anomaly detector on an empty training frame")
        nominal = select_nominal_cycles(train, self.cycle_cap)
        if nominal.empty:
            raise ValueError(f"No training rows with cycle <= {self.cycle_cap}")

        working, kept_sensors = drop_near_zero_variance(
            nominal, SENSOR_COLS, self.var_threshold
        )
        feature_cols = [c for c in OP_SETTING_COLS + kept_sensors if c in working.columns]
        working, feature_cols = drop_near_zero_variance(
            working, feature_cols, self.var_threshold
        )
        if not feature_cols:
            raise ValueError("No varying feature columns available for anomaly detection")

        fill_values = {c: float(working[c].median()) for c in feature_cols}
        X = working[feature_cols].replace([np.inf, -np.inf], np.nan)
        X = X.fillna(fill_values)
        scaler = StandardScaler()
        Xs = scaler.fit_transform(X.to_numpy(dtype=float))
        model = IsolationForest(
            n_estimators=self.n_estimators,
            contamination=self.contamination,
            random_state=self.random_state,
            n_jobs=1,
        )
        model.fit(Xs)

        self.scaler = scaler
        self.model = model
        self.feature_cols = list(feature_cols)
        self.fill_values = fill_values
        return self

    def _require_fitted(self) -> tuple[StandardScaler, IsolationForest]:
        if self.scaler is None or self.model is None or not self.feature_cols:
            raise RuntimeError("Detector is not fitted. Run train_anomaly.py first.")
        return self.scaler, self.model

    def _prepare_matrix(self, frame: pd.DataFrame) -> tuple[np.ndarray, list[str]]:
        scaler, _model = self._require_fitted()
        out = frame.copy()
        notes: list[str] = []
        for col in self.feature_cols:
            if col not in out.columns:
                out[col] = np.nan
                notes.append(f"missing:{col}")
        raw = out[self.feature_cols].apply(pd.to_numeric, errors="coerce")
        invalid = ~np.isfinite(raw.to_numpy(dtype=float))
        if invalid.any():
            notes.append("non_finite_or_unparseable_values_imputed")
        filled = raw.replace([np.inf, -np.inf], np.nan).fillna(self.fill_values)
        Xs = scaler.transform(filled.to_numpy(dtype=float))
        return Xs, notes

    def predict_frame(self, frame: pd.DataFrame) -> pd.DataFrame:
        Xs, notes = self._prepare_matrix(frame)
        _scaler, model = self._require_fitted()
        decision = model.decision_function(Xs)
        labels = model.predict(Xs)
        max_abs_z = np.max(np.abs(Xs), axis=1)
        isolation_outlier = labels == -1
        z_outlier = max_abs_z >= self.z_threshold
        result = pd.DataFrame(
            {
                "decision_score": decision,
                "anomaly_score": -decision,
                "max_abs_z": max_abs_z,
                "isolation_forest_outlier": isolation_outlier,
                "is_anomaly": isolation_outlier | z_outlier,
            },
            index=frame.index,
        )
        result["input_notes"] = ";".join(notes) if notes else ""
        return result

    def predict_readings(self, readings: Mapping[str, Any] | pd.Series | pd.DataFrame) -> dict[str, Any]:
        frame = readings_to_frame(readings)
        scored = self.predict_frame(frame).iloc[0]
        return {
            "anomaly_score": float(scored["anomaly_score"]),
            "decision_score": float(scored["decision_score"]),
            "max_abs_z": float(scored["max_abs_z"]),
            "isolation_forest_outlier": bool(scored["isolation_forest_outlier"]),
            "is_anomaly": bool(scored["is_anomaly"]),
            "z_threshold": float(self.z_threshold),
            "status": "anomalous" if bool(scored["is_anomaly"]) else "normal",
            "input_notes": scored["input_notes"] or None,
            "score_interpretation": SCORE_DOC,
        }

    def save(self, path: Path | None = None) -> Path:
        self._require_fitted()
        path = Path(path) if path else ANOMALY_BUNDLE_PATH
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(
            {
                "model": self.model,
                "scaler": self.scaler,
                "feature_cols": self.feature_cols,
                "fill_values": self.fill_values,
                "contamination": self.contamination,
                "random_state": self.random_state,
                "n_estimators": self.n_estimators,
                "cycle_cap": self.cycle_cap,
                "var_threshold": self.var_threshold,
                "z_threshold": self.z_threshold,
                "kind": "isolation_forest",
                "score_interpretation": SCORE_DOC,
            },
            path,
        )
        return path

    @classmethod
    def load(cls, path: Path | None = None) -> SensorAnomalyDetector:
        path = Path(path) if path else ANOMALY_BUNDLE_PATH
        bundle = joblib.load(path)
        det = cls(
            contamination=float(bundle.get("contamination", 0.02)),
            random_state=int(bundle.get("random_state", 42)),
            n_estimators=int(bundle.get("n_estimators", 200)),
            cycle_cap=int(bundle.get("cycle_cap", 50)),
            var_threshold=float(bundle.get("var_threshold", DEFAULT_VAR_THRESHOLD)),
            z_threshold=float(bundle.get("z_threshold", 6.0)),
        )
        det.model = bundle["model"]
        det.scaler = bundle["scaler"]
        det.feature_cols = list(bundle["feature_cols"])
        det.fill_values = dict(bundle["fill_values"])
        return det
