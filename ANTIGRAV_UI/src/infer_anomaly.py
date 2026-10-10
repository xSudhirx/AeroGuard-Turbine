"""Score sensor readings with the saved Isolation Forest detector."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd

from anomaly_detector import ANOMALY_BUNDLE_PATH, SCORE_DOC, SensorAnomalyDetector
from data_loader import load_train
from synthetic_faults import SCENARIO_SPECS, apply_scenario, pick_nasa_baseline, scenario_sensor_preview


def _print_result(result: dict, extra: dict | None = None) -> None:
    payload = dict(result)
    if extra:
        payload.update(extra)
    print(json.dumps(payload, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Infer anomaly score / flag from a fitted Isolation Forest detector."
    )
    parser.add_argument(
        "--model",
        type=str,
        default=str(ANOMALY_BUNDLE_PATH),
        help="Path to detector.joblib",
    )
    parser.add_argument(
        "--json",
        type=str,
        default=None,
        help='Sensor map JSON string, e.g. {"sensor_3": 1700, "t50_lpt_temp": 1480}',
    )
    parser.add_argument(
        "--json-file",
        type=str,
        default=None,
        help="Path to a JSON object of sensor readings (avoids shell quoting issues).",
    )
    parser.add_argument(
        "--csv",
        type=str,
        default=None,
        help="Optional CSV with C-MAPSS-style columns (whitespace or comma).",
    )
    parser.add_argument(
        "--scenario",
        type=str,
        default=None,
        choices=list(SCENARIO_SPECS),
        help="Score one in-memory synthetic/NASA demo scenario (does not write datasets).",
    )
    args = parser.parse_args()

    path = Path(args.model)
    if not path.exists():
        raise SystemExit(f"Detector not found at {path}. Run: python src/train_anomaly.py")

    detector = SensorAnomalyDetector.load(path)

    if args.json or args.json_file:
        if args.json_file:
            readings = json.loads(Path(args.json_file).read_text(encoding="utf-8"))
        else:
            readings = json.loads(args.json)
        result = detector.predict_readings(readings)
        _print_result(result)
        return

    if args.csv:
        csv_path = Path(args.csv)
        try:
            frame = pd.read_csv(csv_path)
        except Exception:
            frame = pd.read_csv(csv_path, sep=r"\s+", header=None)
        scored = detector.predict_frame(frame)
        print(scored.to_csv(index=False))
        print(SCORE_DOC)
        return

    if args.scenario:
        train = load_train()
        row = apply_scenario(pick_nasa_baseline(train), args.scenario)
        result = detector.predict_readings(row)
        _print_result(
            result,
            extra={
                "scenario_id": args.scenario,
                "is_simulated": bool(SCENARIO_SPECS[args.scenario]["is_simulated"]),
                "source": SCENARIO_SPECS[args.scenario]["source"],
                "label": SCENARIO_SPECS[args.scenario]["label"],
                "sensors_preview": {
                    k: v
                    for k, v in scenario_sensor_preview(row).items()
                    if k in ("sensor_2", "sensor_3", "sensor_4", "sensor_7", "sensor_8", "sensor_9")
                },
            },
        )
        return

    parser.print_help()
    print("\nExamples:")
    print('  python src/infer_anomaly.py --scenario elevated_temperature')
    print('  python src/infer_anomaly.py --json "{\"sensor_3\": 1700, \\"sensor_4\\": 1500}"')


if __name__ == "__main__":
    main()
