from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler

from data_loader import OP_SETTING_COLS, PROCESSED_DIR, SENSOR_COLS

RUL_CAP = 125
DEFAULT_VAR_THRESHOLD = 1e-6
SCALER_PATH = PROCESSED_DIR / "scaler.joblib"
FEATURE_COLS_PATH = PROCESSED_DIR / "feature_cols.joblib"


def drop_near_zero_variance(
    df: pd.DataFrame,
    cols: list[str] | None = None,
    threshold: float = DEFAULT_VAR_THRESHOLD,
    keep_cols: list[str] | None = None,
) -> tuple[pd.DataFrame, list[str]]:
    cols = cols or SENSOR_COLS
    variances = df[cols].var()
    drop = variances[variances <= threshold].index.tolist()
    kept = [c for c in cols if c not in drop]
    if keep_cols is not None:
        kept = [c for c in keep_cols if c in df.columns]
        drop = [c for c in cols if c not in kept]
    out = df.drop(columns=drop, errors="ignore")
    return out, kept


def fit_scaler(df: pd.DataFrame, feature_cols: list[str]) -> StandardScaler:
    scaler = StandardScaler()
    scaler.fit(df[feature_cols].values)
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump({"scaler": scaler, "feature_cols": feature_cols}, SCALER_PATH)
    joblib.dump(feature_cols, FEATURE_COLS_PATH)
    return scaler


def load_scaler_bundle(path: Path = SCALER_PATH) -> tuple[StandardScaler, list[str]]:
    bundle = joblib.load(path)
    return bundle["scaler"], bundle["feature_cols"]


def transform_features(df: pd.DataFrame, scaler: StandardScaler, feature_cols: list[str]) -> pd.DataFrame:
    out = df.copy()
    out[feature_cols] = scaler.transform(out[feature_cols].values)
    return out


def add_train_rul(df: pd.DataFrame, cap: int = RUL_CAP) -> pd.DataFrame:
    out = df.copy()
    max_cycle = out.groupby("unit_id")["cycle"].transform("max")
    out["RUL"] = (max_cycle - out["cycle"]).clip(upper=cap)
    return out


def add_test_rul(df: pd.DataFrame, rul_df: pd.DataFrame) -> pd.DataFrame:
    """Attach true RUL on the last cycle of each test unit only."""
    out = df.copy()
    last_idx = out.groupby("unit_id")["cycle"].idxmax()
    last = out.loc[last_idx].copy()
    last = last.sort_values("unit_id")
    last["RUL"] = rul_df["RUL"].values[: len(last)]
    out["RUL"] = np.nan
    out.loc[last.index, "RUL"] = last["RUL"].values
    return out


def prepare_train_test(
    train: pd.DataFrame,
    test: pd.DataFrame,
    rul_df: pd.DataFrame,
    var_threshold: float = DEFAULT_VAR_THRESHOLD,
) -> tuple[pd.DataFrame, pd.DataFrame, list[str]]:
    train, kept_sensors = drop_near_zero_variance(train, SENSOR_COLS, var_threshold)
    test, _ = drop_near_zero_variance(test, SENSOR_COLS, var_threshold, keep_cols=kept_sensors)
    feature_cols = [c for c in OP_SETTING_COLS + kept_sensors if c in train.columns]
    # drop remaining constant op-settings too
    train, feature_cols = drop_near_zero_variance(train, feature_cols, var_threshold)
    test, _ = drop_near_zero_variance(test, feature_cols, var_threshold, keep_cols=feature_cols)

    scaler = fit_scaler(train, feature_cols)
    train = transform_features(train, scaler, feature_cols)
    test = transform_features(test, scaler, feature_cols)
    train = add_train_rul(train)
    test = add_test_rul(test, rul_df)
    return train, test, feature_cols
