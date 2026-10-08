from __future__ import annotations

import numpy as np
import pandas as pd


def _slope(values: np.ndarray) -> float:
    if len(values) < 2:
        return 0.0
    t = np.arange(len(values), dtype=float)
    return float(np.polyfit(t, values, 1)[0])


def add_rolling_features(df: pd.DataFrame, sensor_cols: list[str], window: int = 5) -> pd.DataFrame:
    out = df.sort_values(["unit_id", "cycle"]).copy()
    grouped = out.groupby("unit_id", group_keys=False)
    extra = {}
    for col in sensor_cols:
        extra[f"{col}_rmean"] = grouped[col].transform(lambda s: s.rolling(window, min_periods=1).mean())
        extra[f"{col}_rstd"] = grouped[col].transform(lambda s: s.rolling(window, min_periods=1).std()).fillna(0.0)
        extra[f"{col}_rslope"] = grouped[col].transform(
            lambda s: s.rolling(window, min_periods=2).apply(_slope, raw=True)
        ).fillna(0.0)
    extra_df = pd.DataFrame(extra, index=out.index)
    return pd.concat([out, extra_df], axis=1)


def build_sequences(
    df: pd.DataFrame,
    seq_len: int = 30,
    feature_cols: list[str] | None = None,
    label_col: str = "RUL",
    last_only: bool = False,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Fixed-length sliding windows. Short units are left-padded with the first row."""
    if feature_cols is None:
        raise ValueError("feature_cols is required")
    X, y, units = [], [], []
    for uid, group in df.groupby("unit_id"):
        group = group.sort_values("cycle")
        feats = group[feature_cols].to_numpy(dtype=np.float32)
        labels = group[label_col].to_numpy(dtype=np.float32) if label_col in group.columns else None
        n = len(group)
        if n < seq_len:
            pad = np.repeat(feats[:1], seq_len - n, axis=0)
            seq = np.vstack([pad, feats])
            X.append(seq)
            y.append(labels[-1] if labels is not None else np.nan)
            units.append(uid)
            continue
        starts = [n - seq_len] if last_only else range(0, n - seq_len + 1)
        for start in starts:
            end = start + seq_len
            X.append(feats[start:end])
            y.append(labels[end - 1] if labels is not None else np.nan)
            units.append(uid)
    return np.asarray(X, dtype=np.float32), np.asarray(y, dtype=np.float32), np.asarray(units)
