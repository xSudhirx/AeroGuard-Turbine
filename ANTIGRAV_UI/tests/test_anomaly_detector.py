"""Validation examples for the Isolation Forest anomaly detector."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
sys.path.insert(0, str(SRC))

from anomaly_detector import SensorAnomalyDetector  # noqa: E402
from data_loader import COLUMNS, SENSOR_COLS, load_train  # noqa: E402
from synthetic_faults import apply_scenario, pick_nasa_baseline  # noqa: E402


def _tiny_train(n_units: int = 3, n_cycles: int = 20) -> pd.DataFrame:
    rng = np.random.default_rng(0)
    rows = []
    for uid in range(1, n_units + 1):
        for cycle in range(1, n_cycles + 1):
            row = {c: 0.0 for c in COLUMNS}
            row["unit_id"] = uid
            row["cycle"] = cycle
            row["op_setting_1"] = 0.0
            row["op_setting_2"] = 0.0
            row["op_setting_3"] = 100.0
            for i, col in enumerate(SENSOR_COLS):
                row[col] = 100.0 + i + rng.normal(0, 0.5)
            rows.append(row)
    return pd.DataFrame(rows)


class AnomalyDetectorTests(unittest.TestCase):
    def test_missing_and_invalid_input_do_not_raise(self):
        det = SensorAnomalyDetector(cycle_cap=20, n_estimators=20, contamination=0.1)
        det.fit(_tiny_train())
        result = det.predict_readings(
            {
                "sensor_3": "not-a-number",
                "sensor_4": np.inf,
                "unknown_channel": 1,
            }
        )
        self.assertIn("anomaly_score", result)
        self.assertIn("is_anomaly", result)
        self.assertIsInstance(result["is_anomaly"], bool)
        self.assertIsInstance(result["anomaly_score"], float)
        self.assertTrue(np.isfinite(result["anomaly_score"]))
        self.assertIn("calibrated probability of failure", result["score_interpretation"].lower())

    def test_large_synthetic_temperature_fault_is_flagged(self):
        det = SensorAnomalyDetector(cycle_cap=20, n_estimators=40, contamination=0.05)
        det.fit(_tiny_train(n_units=5, n_cycles=30))
        baseline = _tiny_train(n_units=1, n_cycles=1).iloc[0]
        healthy = det.predict_readings(baseline)
        fault = apply_scenario(baseline, "elevated_temperature")
        anomalous = det.predict_readings(fault)
        self.assertGreater(anomalous["anomaly_score"], healthy["anomaly_score"])
        self.assertTrue(anomalous["is_anomaly"])

    def test_real_fd001_training_fit_when_data_present(self):
        train_path = ROOT / "data" / "raw" / "train_FD001.txt"
        if not train_path.exists():
            self.skipTest("train_FD001.txt not present")
        train = load_train()
        det = SensorAnomalyDetector(n_estimators=80)
        det.fit(train)
        nasa = pick_nasa_baseline(train)
        healthy = det.predict_readings(nasa)
        fault = det.predict_readings(apply_scenario(nasa, "elevated_temperature"))
        self.assertFalse(healthy["is_anomaly"])
        self.assertTrue(fault["is_anomaly"])
        self.assertGreater(fault["anomaly_score"], healthy["anomaly_score"])


if __name__ == "__main__":
    unittest.main()
