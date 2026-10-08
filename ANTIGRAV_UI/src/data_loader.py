from __future__ import annotations

from pathlib import Path

import pandas as pd

SENSOR_COLS = [f"sensor_{i}" for i in range(1, 22)]
OP_SETTING_COLS = ["op_setting_1", "op_setting_2", "op_setting_3"]
COLUMNS = ["unit_id", "cycle", *OP_SETTING_COLS, *SENSOR_COLS]

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"
PROCESSED_DIR = ROOT / "data" / "processed"
MODELS_DIR = ROOT / "models"


def load_train(path: str | Path | None = None) -> pd.DataFrame:
    path = Path(path) if path else RAW_DIR / "train_FD001.txt"
    return pd.read_csv(path, sep=r"\s+", header=None, names=COLUMNS)


def load_test(path: str | Path | None = None) -> pd.DataFrame:
    path = Path(path) if path else RAW_DIR / "test_FD001.txt"
    return pd.read_csv(path, sep=r"\s+", header=None, names=COLUMNS)


def load_rul(path: str | Path | None = None) -> pd.DataFrame:
    path = Path(path) if path else RAW_DIR / "RUL_FD001.txt"
    return pd.read_csv(path, sep=r"\s+", header=None, names=["RUL"])
