AeroGuard Turbine predicts NASA C-MAPSS FD001 engine Remaining Useful Life (baseline + LSTM) and maps RUL to Healthy/Degrading/Critical QA risk buckets.

Place `train_FD001.txt`, `test_FD001.txt`, and `RUL_FD001.txt` in `data/raw/`.

```
pip install -r requirements.txt
python src/train_baseline.py
python src/train_lstm.py
python src/evaluate.py
```

Status: Phase 1 (tree baseline), Phase 2 (LSTM), and Phase 4 (risk classification) are implemented; Phase 3 (`src/train_transformer.py`) is stubbed for the next iteration.
Phase 3 architecture references are in the project spec doc.
