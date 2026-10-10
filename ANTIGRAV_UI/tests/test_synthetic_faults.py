"""Synthetic fault scenarios must stay separate from NASA dataset files."""

from __future__ import annotations

import hashlib
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
sys.path.insert(0, str(SRC))

from data_loader import load_train  # noqa: E402
from sensor_schema import PRESSURE_SENSORS, SPEED_PROXY_SENSORS, TEMPERATURE_SENSORS  # noqa: E402
from synthetic_faults import (  # noqa: E402
    SYNTHETIC_SOURCE,
    generate_scenario_rows,
    pick_nasa_baseline,
)


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


class SyntheticFaultTests(unittest.TestCase):
    def test_scenarios_change_expected_channels_and_are_labeled(self):
        train_path = ROOT / "data" / "raw" / "train_FD001.txt"
        if not train_path.exists():
            self.skipTest("train_FD001.txt not present")
        train = load_train()
        before = {p.name: _sha256(p) for p in (ROOT / "data" / "raw").glob("*.txt")}
        frame = generate_scenario_rows(train)
        after = {p.name: _sha256(p) for p in (ROOT / "data" / "raw").glob("*.txt")}
        self.assertEqual(before, after)

        ids = set(frame["scenario_id"])
        self.assertIn("healthy_nasa", ids)
        self.assertIn("elevated_temperature", ids)
        self.assertIn("abnormal_pressure", ids)
        self.assertIn("unusual_speed_vibration_proxy", ids)

        healthy = frame.loc[frame["scenario_id"] == "healthy_nasa"].iloc[0]
        self.assertFalse(bool(healthy["is_simulated"]))
        temp = frame.loc[frame["scenario_id"] == "elevated_temperature"].iloc[0]
        self.assertTrue(bool(temp["is_simulated"]))
        self.assertEqual(temp["source"], SYNTHETIC_SOURCE)
        baseline = pick_nasa_baseline(train)
        for col in TEMPERATURE_SENSORS:
            self.assertGreater(float(temp[col]), float(baseline[col]))
        pressure = frame.loc[frame["scenario_id"] == "abnormal_pressure"].iloc[0]
        for col in PRESSURE_SENSORS:
            self.assertGreater(float(pressure[col]), float(baseline[col]))
        speed = frame.loc[frame["scenario_id"] == "unusual_speed_vibration_proxy"].iloc[0]
        for col in SPEED_PROXY_SENSORS:
            self.assertGreater(float(speed[col]), float(baseline[col]))

    def test_generate_does_not_require_writing_processed_files(self):
        train_path = ROOT / "data" / "raw" / "train_FD001.txt"
        if not train_path.exists():
            self.skipTest("train_FD001.txt not present")
        processed = ROOT / "data" / "processed"
        before = sorted(p.name for p in processed.glob("*")) if processed.exists() else []
        generate_scenario_rows(load_train())
        after = sorted(p.name for p in processed.glob("*")) if processed.exists() else []
        self.assertEqual(before, after)


if __name__ == "__main__":
    unittest.main()
