from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np

from data_loader import MODELS_DIR
from risk_classifier import evaluate_risk_classification


def compute_rmse(true, pred) -> float:
    true = np.asarray(true, dtype=float)
    pred = np.asarray(pred, dtype=float)
    return float(np.sqrt(np.mean((pred - true) ** 2)))


def compute_phm08_score(true, pred) -> float:
    true = np.asarray(true, dtype=float)
    pred = np.asarray(pred, dtype=float)
    err = pred - true
    score = np.where(err < 0, np.exp(-err / 13.0) - 1.0, np.exp(err / 10.0) - 1.0)
    return float(np.sum(score))


def run_full_evaluation(true, pred, model_name: str) -> dict:
    rmse = compute_rmse(true, pred)
    phm = compute_phm08_score(true, pred)
    print("\n" + "=" * 52)
    print(f"Evaluation: {model_name}")
    print("=" * 52)
    print(f"{'metric':<24}{'value':>12}")
    print(f"{'-'*24}{'-'*12}")
    print(f"{'RMSE':<24}{rmse:12.4f}")
    print(f"{'PHM08 score':<24}{phm:12.4f}")
    print(f"{'n_samples':<24}{len(np.asarray(true)):12d}")
    risk = evaluate_risk_classification(true, pred)
    return {"model_name": model_name, "rmse": rmse, "phm08": phm, **risk}


def _load_npz(path: Path) -> tuple[np.ndarray, np.ndarray, str]:
    data = np.load(path, allow_pickle=True)
    y_true = data["y_true"]
    y_pred = data["y_pred"]
    name = str(data["model_name"]) if "model_name" in data.files else path.parent.name
    return y_true, y_pred, name


def _evaluate_from_saved_models() -> int:
    """Fallback: score test units from saved baseline/LSTM artifacts."""
    ran = 0
    from data_loader import load_rul, load_test, load_train
    from features import add_rolling_features, build_sequences
    from preprocessing import load_scaler_bundle, prepare_train_test

    train = load_train()
    test = load_test()
    rul = load_rul()
    train_p, test_p, feature_cols = prepare_train_test(train, test, rul)
    test_last = test_p.dropna(subset=["RUL"]).sort_values("unit_id")

    baseline_model = MODELS_DIR / "baseline" / "model.joblib"
    if baseline_model.exists():
        import joblib

        sensor_cols = [c for c in feature_cols if c.startswith("sensor_")]
        test_feat = add_rolling_features(test_p, sensor_cols)
        last = test_feat.loc[test_feat.groupby("unit_id")["cycle"].idxmax()].sort_values("unit_id")
        bundle = joblib.load(baseline_model)
        model = bundle["model"]
        cols = bundle["feature_names"]
        y_pred = model.predict(last[cols].to_numpy())
        y_true = last["RUL"].to_numpy()
        run_full_evaluation(y_true, y_pred, "baseline")
        ran += 1

    lstm_weights = MODELS_DIR / "lstm" / "model.pt"
    if lstm_weights.exists():
        import torch

        from train_lstm import LSTMRulModel

        scaler, feat_cols = load_scaler_bundle()
        X, y, _ = build_sequences(test_p, seq_len=30, feature_cols=feat_cols, last_only=True)
        mask = np.isfinite(y)
        X, y = X[mask], y[mask]
        ckpt = torch.load(lstm_weights, map_location="cpu", weights_only=False)
        model = LSTMRulModel(input_size=X.shape[-1])
        model.load_state_dict(ckpt["state_dict"] if isinstance(ckpt, dict) and "state_dict" in ckpt else ckpt)
        model.eval()
        with torch.no_grad():
            y_pred = model(torch.from_numpy(X)).squeeze(-1).numpy()
        run_full_evaluation(y, y_pred, "lstm")
        ran += 1
        _ = scaler
    return ran


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate saved AeroGuard RUL predictions")
    parser.add_argument("--pred", type=str, default=None, help="Optional .npz with y_true, y_pred")
    args = parser.parse_args()

    candidates = []
    if args.pred:
        candidates.append(Path(args.pred))
    else:
        candidates.extend(
            [
                MODELS_DIR / "baseline" / "test_predictions.npz",
                MODELS_DIR / "lstm" / "test_predictions.npz",
            ]
        )

    ran = 0
    for path in candidates:
        if path.exists():
            y_true, y_pred, name = _load_npz(path)
            run_full_evaluation(y_true, y_pred, name)
            ran += 1

    if ran == 0:
        print("No saved prediction files found; attempting inference from saved models...")
        ran = _evaluate_from_saved_models()

    if ran == 0:
        raise SystemExit(
            "Nothing to evaluate. Run python src/train_baseline.py and/or python src/train_lstm.py first."
        )


if __name__ == "__main__":
    main()
