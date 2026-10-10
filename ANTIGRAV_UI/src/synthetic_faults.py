"""Illustrative sensor-fault scenarios for demonstration and tests only.

Synthetic rows are never written to ``data/raw`` or mixed into NASA training
or evaluation files. C-MAPSS FD001 has no vibration channel; speed sensors
are used as a mechanical-proxy demonstration only.
"""

from __future__ import annotations

from typing import Any

import pandas as pd

from data_loader import SENSOR_COLS
from sensor_schema import PRESSURE_SENSORS, SPEED_PROXY_SENSORS, TEMPERATURE_SENSORS

SYNTHETIC_SOURCE = "synthetic_demo"
NASA_SOURCE = "nasa_cmapss_fd001"

SCENARIO_SPECS: dict[str, dict[str, Any]] = {
    "healthy_nasa": {
        "label": "NASA FD001 early-life sample",
        "description": "Unmodified observation copied from train_FD001 (not a fault).",
        "is_simulated": False,
        "source": NASA_SOURCE,
    },
    "elevated_temperature": {
        "label": "Synthetic: elevated temperature",
        "description": "Adds +80 °R to T24/T30/T50 (sensor_2/3/4) on a NASA baseline row.",
        "is_simulated": True,
        "source": SYNTHETIC_SOURCE,
        "offsets": {col: 80.0 for col in TEMPERATURE_SENSORS},
    },
    "abnormal_pressure": {
        "label": "Synthetic: abnormal pressure",
        "description": "Scales P15/P30/Ps30 (sensor_6/7/11) by 1.35 on a NASA baseline row.",
        "is_simulated": True,
        "source": SYNTHETIC_SOURCE,
        "scales": {col: 1.35 for col in PRESSURE_SENSORS},
    },
    "unusual_speed_vibration_proxy": {
        "label": "Synthetic: unusual speed (vibration proxy)",
        "description": (
            "FD001 has no vibration transducer. This demo offsets Nf/Nc/NRf/NRc "
            "(sensor_8/9/13/14) by +4% as a mechanical-speed proxy only."
        ),
        "is_simulated": True,
        "source": SYNTHETIC_SOURCE,
        "scales": {col: 1.04 for col in SPEED_PROXY_SENSORS},
    },
}


def clone_baseline_row(row: pd.Series) -> pd.Series:
    out = row.copy()
    return out


def apply_scenario(row: pd.Series, scenario_id: str) -> pd.Series:
    if scenario_id not in SCENARIO_SPECS:
        raise KeyError(f"Unknown scenario_id: {scenario_id}")
    spec = SCENARIO_SPECS[scenario_id]
    out = clone_baseline_row(row)
    for col, delta in spec.get("offsets", {}).items():
        if col in out.index:
            out[col] = float(out[col]) + float(delta)
    for col, factor in spec.get("scales", {}).items():
        if col in out.index:
            out[col] = float(out[col]) * float(factor)
    out["scenario_id"] = scenario_id
    out["is_simulated"] = spec["is_simulated"]
    out["source"] = spec["source"]
    return out


def pick_nasa_baseline(train: pd.DataFrame, unit_id: int = 1, cycle: int = 1) -> pd.Series:
    """Copy a genuine NASA training row; never mutates the source frame."""
    match = train[(train["unit_id"] == unit_id) & (train["cycle"] == cycle)]
    if match.empty:
        match = train.sort_values(["unit_id", "cycle"]).head(1)
    if match.empty:
        raise ValueError("Training frame has no rows to use as a NASA baseline")
    return match.iloc[0].copy()


def generate_scenario_rows(train: pd.DataFrame) -> pd.DataFrame:
    """Return one NASA copy plus synthetic variants. Does not touch disk datasets."""
    baseline = pick_nasa_baseline(train)
    rows = [apply_scenario(baseline, sid) for sid in SCENARIO_SPECS]
    frame = pd.DataFrame(rows).reset_index(drop=True)
    # Keep only original C-MAPSS columns plus scenario metadata.
    keep = [c for c in train.columns if c in frame.columns] + [
        "scenario_id",
        "is_simulated",
        "source",
    ]
    keep = list(dict.fromkeys(keep))
    return frame[keep]


def scenario_sensor_preview(row: pd.Series) -> dict[str, float]:
    preview = {}
    for col in SENSOR_COLS:
        if col in row.index and pd.notna(row[col]):
            preview[col] = float(row[col])
    return preview
