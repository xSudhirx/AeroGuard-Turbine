from __future__ import annotations

import numpy as np
import torch
import torch.nn as nn
from sklearn.model_selection import GroupShuffleSplit
from torch.utils.data import DataLoader, TensorDataset

from data_loader import MODELS_DIR, load_rul, load_test, load_train
from features import build_sequences
from preprocessing import prepare_train_test


class LSTMRulModel(nn.Module):
    def __init__(self, input_size: int, hidden_size: int = 64, dropout: float = 0.2):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=2,
            batch_first=True,
            dropout=dropout,
        )
        self.head = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(hidden_size, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out, _ = self.lstm(x)
        return self.head(out[:, -1, :])


def _rmse(pred: torch.Tensor, true: torch.Tensor) -> float:
    return float(torch.sqrt(torch.mean((pred - true) ** 2)).item())


def main() -> None:
    torch.manual_seed(42)
    np.random.seed(42)

    train = load_train()
    test = load_test()
    rul = load_rul()
    train, test, feature_cols = prepare_train_test(train, test, rul)

    X, y, units = build_sequences(train, seq_len=30, feature_cols=feature_cols)
    gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    tr_idx, va_idx = next(gss.split(X, groups=units))
    X_tr, y_tr = X[tr_idx], y[tr_idx]
    X_va, y_va = X[va_idx], y[va_idx]

    train_ds = TensorDataset(torch.from_numpy(X_tr), torch.from_numpy(y_tr).unsqueeze(1))
    val_ds = TensorDataset(torch.from_numpy(X_va), torch.from_numpy(y_va).unsqueeze(1))
    train_loader = DataLoader(train_ds, batch_size=128, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=256, shuffle=False)

    device = torch.device("cpu")
    model = LSTMRulModel(input_size=X.shape[-1]).to(device)
    opt = torch.optim.Adam(model.parameters(), lr=1e-3)
    loss_fn = nn.MSELoss()

    out_dir = MODELS_DIR / "lstm"
    out_dir.mkdir(parents=True, exist_ok=True)
    best_val = float("inf")
    patience = 5
    stale = 0
    max_epochs = 20

    print("Training LSTM (CPU)...")
    for epoch in range(1, max_epochs + 1):
        model.train()
        for xb, yb in train_loader:
            xb, yb = xb.to(device), yb.to(device)
            opt.zero_grad()
            pred = model(xb)
            loss = loss_fn(pred, yb)
            loss.backward()
            opt.step()

        model.eval()
        preds, trues = [], []
        with torch.no_grad():
            for xb, yb in val_loader:
                p = model(xb.to(device))
                preds.append(p.cpu())
                trues.append(yb)
        val_rmse = _rmse(torch.cat(preds), torch.cat(trues))
        print(f"epoch {epoch:02d}  val RMSE={val_rmse:.4f}")
        if val_rmse + 1e-4 < best_val:
            best_val = val_rmse
            stale = 0
            torch.save({"state_dict": model.state_dict(), "input_size": X.shape[-1]}, out_dir / "model.pt")
        else:
            stale += 1
            if stale >= patience:
                print(f"Early stopping at epoch {epoch} (best val RMSE={best_val:.4f})")
                break

    ckpt = torch.load(out_dir / "model.pt", map_location="cpu", weights_only=False)
    model.load_state_dict(ckpt["state_dict"])
    model.eval()

    X_test, y_test, _ = build_sequences(test, seq_len=30, feature_cols=feature_cols, last_only=True)
    mask = np.isfinite(y_test)
    X_test, y_test = X_test[mask], y_test[mask]
    with torch.no_grad():
        y_pred = model(torch.from_numpy(X_test)).squeeze(-1).numpy()
    np.savez(out_dir / "test_predictions.npz", y_true=y_test, y_pred=y_pred, model_name=np.array("lstm"))
    print(f"Saved LSTM weights and test predictions to {out_dir}")


if __name__ == "__main__":
    main()
