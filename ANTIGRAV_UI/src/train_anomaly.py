"""Fit Isolation Forest on NASA C-MAPSS FD001 training data only.

Does not retrain or overwrite RUL models under models/baseline or models/lstm.
Does not write synthetic faults into data/raw or data/processed.
"""

from __future__ import annotations

import json
from pathlib import Path

from anomaly_detector import ANOMALY_DIR, SCORE_DOC, SensorAnomalyDetector, select_nominal_cycles
from data_loader import ROOT, load_train
from synthetic_faults import SCENARIO_SPECS, generate_scenario_rows, scenario_sensor_preview

DEMO_JSON_PATH = ROOT / "aeroguard-ui" / "src" / "data" / "anomalyDemo.json"


def export_demo_bundle(detector: SensorAnomalyDetector, train) -> Path:
    scenarios = generate_scenario_rows(train)
    scored = detector.predict_frame(scenarios)
    records = []
    for i, row in scenarios.iterrows():
        sid = str(row["scenario_id"])
        spec = SCENARIO_SPECS[sid]
        pred = scored.loc[i]
        records.append(
            {
                "id": sid,
                "label": spec["label"],
                "description": spec["description"],
                "source": spec["source"],
                "is_simulated": bool(spec["is_simulated"]),
                "anomaly_score": float(pred["anomaly_score"]),
                "decision_score": float(pred["decision_score"]),
                "max_abs_z": float(pred["max_abs_z"]),
                "isolation_forest_outlier": bool(pred["isolation_forest_outlier"]),
                "is_anomaly": bool(pred["is_anomaly"]),
                "status": "anomalous" if bool(pred["is_anomaly"]) else "normal",
                "sensors": scenario_sensor_preview(row),
            }
        )
    payload = {
        "disclaimer": (
            "Local demonstration only. No live turbine is connected. "
            "The 3D digital twin is a visualization; these scores come from a "
            "batch Isolation Forest run on NASA C-MAPSS FD001 plus synthetic "
            "fault rows that are not part of the NASA files."
        ),
        "score_interpretation": SCORE_DOC,
        "model": {
            "kind": "isolation_forest",
            "trained_on": "train_FD001.txt early-life cycles only",
            "contamination": detector.contamination,
            "z_threshold": detector.z_threshold,
            "cycle_cap": detector.cycle_cap,
            "feature_cols": detector.feature_cols,
        },
        "scenarios": records,
    }
    DEMO_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    DEMO_JSON_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return DEMO_JSON_PATH


def main() -> None:
    train = load_train()
    detector = SensorAnomalyDetector()
    detector.fit(train)
    out = detector.save()
    print(f"Saved anomaly detector to {out}")

    nominal = select_nominal_cycles(train, detector.cycle_cap)
    train_scores = detector.predict_frame(nominal)
    flagged = int(train_scores["is_anomaly"].sum())
    print(
        f"Training envelope rows (cycle <= {detector.cycle_cap}): {len(train_scores)} "
        f"| Isolation Forest outlier labels: {flagged} "
        f"({flagged / max(len(train_scores), 1):.2%})"
    )
    print("This rate is expected to track the contamination setting; it is not a test metric.")

    demo_path = export_demo_bundle(detector, train)
    print(f"Wrote frontend demo snapshot to {demo_path}")
    print("Synthetic rows were scored in memory only; NASA data files were not modified.")
    print(SCORE_DOC)


if __name__ == "__main__":
    main()
