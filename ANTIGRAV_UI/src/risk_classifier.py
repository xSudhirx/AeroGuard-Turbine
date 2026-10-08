from __future__ import annotations

import numpy as np
from sklearn.metrics import confusion_matrix, precision_recall_fscore_support

BUCKETS = ("Healthy", "Degrading", "Critical")


def rul_to_risk_bucket(rul_array) -> np.ndarray:
    rul = np.asarray(rul_array, dtype=float)
    labels = np.empty(rul.shape, dtype=object)
    labels[rul > 80] = "Healthy"
    labels[(rul >= 20) & (rul <= 80)] = "Degrading"
    labels[rul < 20] = "Critical"
    return labels


def evaluate_risk_classification(true_rul, pred_rul) -> dict:
    y_true = rul_to_risk_bucket(true_rul)
    y_pred = rul_to_risk_bucket(pred_rul)
    cm = confusion_matrix(y_true, y_pred, labels=list(BUCKETS))
    prec, rec, f1, support = precision_recall_fscore_support(
        y_true, y_pred, labels=list(BUCKETS), zero_division=0
    )
    print("\nRisk classification (Healthy / Degrading / Critical)")
    print("Confusion matrix rows=true, cols=pred:", BUCKETS)
    print(cm)
    print(f"{'class':<12}{'precision':>12}{'recall':>12}{'support':>10}")
    for name, p, r, s in zip(BUCKETS, prec, rec, support):
        print(f"  {name:<10}{p:12.3f}{r:12.3f}{s:10d}")
    crit_recall = float(rec[BUCKETS.index("Critical")])
    print(f"KEY QA METRIC  Critical-class recall: {crit_recall:.3f}")
    return {
        "confusion_matrix": cm,
        "precision": dict(zip(BUCKETS, map(float, prec))),
        "recall": dict(zip(BUCKETS, map(float, rec))),
        "f1": dict(zip(BUCKETS, map(float, f1))),
        "critical_recall": crit_recall,
    }
