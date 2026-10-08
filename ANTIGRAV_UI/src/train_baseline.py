from __future__ import annotations

import joblib
import numpy as np
from sklearn.model_selection import GroupShuffleSplit

from data_loader import MODELS_DIR, load_rul, load_test, load_train
from features import add_rolling_features
from preprocessing import prepare_train_test


def _get_regressor():
    try:
        from xgboost import XGBRegressor

        return XGBRegressor(
            n_estimators=300,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            objective="reg:squarederror",
            n_jobs=4,
            random_state=42,
        ), "xgboost"
    except ImportError:
        from sklearn.ensemble import RandomForestRegressor

        return RandomForestRegressor(
            n_estimators=200, max_depth=12, n_jobs=4, random_state=42
        ), "random_forest"


def main() -> None:
    train = load_train()
    test = load_test()
    rul = load_rul()
    train, test, feature_cols = prepare_train_test(train, test, rul)
    sensor_cols = [c for c in feature_cols if c.startswith("sensor_")]

    train = add_rolling_features(train, sensor_cols)
    test = add_rolling_features(test, sensor_cols)
    roll_cols = [c for c in train.columns if c.endswith(("_rmean", "_rstd", "_rslope"))]
    x_cols = feature_cols + roll_cols

    gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    tr_idx, va_idx = next(gss.split(train, groups=train["unit_id"]))
    X_tr, y_tr = train.iloc[tr_idx][x_cols], train.iloc[tr_idx]["RUL"]
    X_va, y_va = train.iloc[va_idx][x_cols], train.iloc[va_idx]["RUL"]

    model, kind = _get_regressor()
    print(f"Training baseline ({kind})...")
    if kind == "xgboost":
        model.fit(X_tr, y_tr, eval_set=[(X_va, y_va)], verbose=False)
    else:
        model.fit(X_tr, y_tr)

    from evaluate import compute_rmse

    val_rmse = compute_rmse(y_va, model.predict(X_va))
    print(f"Validation RMSE: {val_rmse:.4f}")

    importances = np.asarray(model.feature_importances_)
    top = np.argsort(importances)[::-1][:15]
    print("\nTop 15 feature importances:")
    for i in top:
        print(f"  {x_cols[i]:<28} {importances[i]:.6f}")

    last = test.loc[test.groupby("unit_id")["cycle"].idxmax()].sort_values("unit_id")
    y_true = last["RUL"].to_numpy(dtype=float)
    y_pred = model.predict(last[x_cols].to_numpy())

    out_dir = MODELS_DIR / "baseline"
    out_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": model, "feature_names": x_cols, "kind": kind}, out_dir / "model.joblib")
    np.savez(out_dir / "test_predictions.npz", y_true=y_true, y_pred=y_pred, model_name=np.array("baseline"))
    print(f"Saved baseline model and test predictions to {out_dir}")


if __name__ == "__main__":
    main()
