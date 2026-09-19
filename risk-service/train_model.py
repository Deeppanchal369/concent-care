import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import precision_score, recall_score, f1_score, confusion_matrix, classification_report
import joblib
import json
import os

RANDOM_STATE = 42
N_SAMPLES = 4000
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.joblib")
METRICS_PATH = os.path.join(os.path.dirname(__file__), "metrics.json")

FEATURE_NAMES = [
    "age", "days_since_last_visit", "visits_last_12_months",
    "active_prescription_count", "chronic_condition_flag",
    "consent_revocations_count", "missed_appointments_count",
]


def generate_synthetic_dataset(n=N_SAMPLES, seed=RANDOM_STATE):
    rng = np.random.default_rng(seed)
    age = rng.integers(1, 90, size=n)
    days_since_last_visit = rng.integers(0, 400, size=n)
    visits_last_12_months = rng.poisson(3, size=n)
    active_prescription_count = rng.poisson(1.5, size=n)
    chronic_condition_flag = rng.binomial(1, 0.3, size=n)
    consent_revocations_count = rng.poisson(0.3, size=n)
    missed_appointments_count = rng.poisson(0.8, size=n)

    risk_score = (
        0.015 * days_since_last_visit
        + 0.9 * missed_appointments_count
        - 0.35 * visits_last_12_months
        + 0.6 * chronic_condition_flag
        - 0.25 * active_prescription_count * chronic_condition_flag
        + 0.4 * consent_revocations_count
        + 0.02 * np.abs(age - 45)
        + rng.normal(0, 1.2, size=n)
    )
    threshold = np.quantile(risk_score, 0.72)
    label = (risk_score > threshold).astype(int)

    return pd.DataFrame({
        "age": age, "days_since_last_visit": days_since_last_visit,
        "visits_last_12_months": visits_last_12_months,
        "active_prescription_count": active_prescription_count,
        "chronic_condition_flag": chronic_condition_flag,
        "consent_revocations_count": consent_revocations_count,
        "missed_appointments_count": missed_appointments_count,
        "high_risk": label,
    })


def train_and_save():
    df = generate_synthetic_dataset()
    X = df[FEATURE_NAMES]
    y = df["high_risk"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=RANDOM_STATE, stratify=y)

    clf = RandomForestClassifier(n_estimators=200, max_depth=8, min_samples_leaf=5, random_state=RANDOM_STATE, class_weight="balanced")
    clf.fit(X_train, y_train)
    y_pred = clf.predict(X_test)

    metrics = {
        "precision": round(precision_score(y_test, y_pred), 4),
        "recall": round(recall_score(y_test, y_pred), 4),
        "f1_score": round(f1_score(y_test, y_pred), 4),
        "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
        "classification_report": classification_report(y_test, y_pred, output_dict=True),
        "feature_importances": dict(zip(FEATURE_NAMES, [round(x, 4) for x in clf.feature_importances_])),
        "train_size": len(X_train), "test_size": len(X_test),
        "positive_class_rate": round(float(y.mean()), 4),
    }
    joblib.dump({"model": clf, "features": FEATURE_NAMES}, MODEL_PATH)
    with open(METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)
    print("Model trained and saved to", MODEL_PATH)
    print(json.dumps(metrics, indent=2))
    return metrics


if __name__ == "__main__":
    train_and_save()
