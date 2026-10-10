AeroGuard Turbine predicts NASA C-MAPSS FD001 Remaining Useful Life (baseline + LSTM) and maps RUL to Healthy / Degrading / Critical QA risk buckets. A separate Isolation Forest module scores **sensor-envelope unusualness**; that score is not Remaining Useful Life and is not a calibrated probability of failure.

Place `train_FD001.txt`, `test_FD001.txt`, and `RUL_FD001.txt` in `data/raw/`.

## RUL prediction (existing)

```
pip install -r requirements.txt
python src/train_baseline.py
python src/train_lstm.py
python src/evaluate.py
```

Do not retrain these unless you intend to replace `models/baseline/` and `models/lstm/`. `evaluate.py` scores saved `test_predictions.npz` files when they are present and does not need a retrain.

Status: Phase 1 (tree baseline), Phase 2 (LSTM), and Phase 4 (risk classification) are implemented; Phase 3 (`src/train_transformer.py`) is stubbed for the next iteration.

## Sensor anomaly detection (new)

RUL models answer “how many cycles until end of life under the C-MAPSS degradation process.” The anomaly detector answers “how unusual is this sensor vector versus early-life FD001 training cycles.” End-of-life degradation, a sensor spike, and a synthetic demo fault can all look unusual; only the last two are illustrated on purpose in the UI.

### Dataset and sensor-column assumptions

- File: NASA C-MAPSS **FD001** `train_FD001.txt` (whitespace, no header).
- Columns match `src/data_loader.py`: `unit_id`, `cycle`, `op_setting_1..3`, `sensor_1..21`.
- Names/units follow the standard C-MAPSS map in `src/sensor_schema.py` (T24/T30/T50 in °R, P30/Ps30 in psia, Nf/Nc in rpm, …).
- Near-zero-variance channels are dropped using the same variance threshold as RUL preprocessing, but the anomaly scaler is stored only under `models/anomaly/` so the RUL scaler in `data/processed/` is left alone.
- The detector is fit on **training rows with `cycle <= 50` only** (nominal early life). `test_FD001` is not used for fitting.
- C-MAPSS has **no vibration transducer**. The “vibration-like” demo perturbs fan/core speed channels as a mechanical proxy and is labeled as such.

### Train and infer

From the `ANTIGRAV_UI` directory (so `python src/...` puts `src` on `sys.path`):

```
python src/train_anomaly.py
python src/infer_anomaly.py --scenario elevated_temperature
python src/infer_anomaly.py --json-file path/to/readings.json
```

Artifacts (do not overwrite RUL models):

- `models/anomaly/detector.joblib` — Isolation Forest, StandardScaler, medians for imputation, feature list.
- `aeroguard-ui/src/data/anomalyDemo.json` — batch scores for the UI demo. This is a snapshot, not a live API.

`predict_readings` returns `anomaly_score` (`-decision_function`, higher = more unusual), `decision_score`, `max_abs_z`, and `is_anomaly` (Isolation Forest outlier **or** `max_abs_z >= 6`). Missing, non-numeric, and infinite values are imputed with training medians. Isolation Forest alone can miss a spike in a few channels when many other sensors stay nominal; the z-threshold is a documented complement, not a failure probability.

### Synthetic fault scenarios (demo/tests only)

`src/synthetic_faults.py` clones a NASA training row in memory and applies:

- `elevated_temperature` — +80 °R on T24/T30/T50
- `abnormal_pressure` — ×1.35 on P15/P30/Ps30
- `unusual_speed_vibration_proxy` — ×1.04 on Nf/Nc/NRf/NRc

These rows are **not** written to `data/raw` or `data/processed`. Run:

```
python src/infer_anomaly.py --scenario abnormal_pressure
python -m unittest discover -s tests -v
```

### Frontend (digital twin demo)

The React / Vite / Three.js app has **no live backend**. The anomaly panel reads `anomalyDemo.json` and is labeled NASA sample vs simulated fault. It does not claim a physical turbine is connected, and the 3D model is unchanged visualization.

```
cd aeroguard-ui
npm install
npm run dev
```

Production build:

```
cd aeroguard-ui
npm run build
```

## Limitations

- Isolation Forest scores are relative to the fitted early-life envelope, not failure probabilities.
- FD001 is simulated turbofan run-to-failure data, not plant telemetry from this UI.
- Synthetic faults are illustrative offsets; they are not NASA observations.
- Frontend demo scores are frozen at `train_anomaly.py` time; changing the detector requires re-running that script to refresh the JSON snapshot.
