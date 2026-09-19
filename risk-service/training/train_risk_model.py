import os
import sys
import json
import datetime
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report
)
import joblib

# Add parent directory to path to import preprocessing
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SERVICE_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if SERVICE_ROOT not in sys.path:
    sys.path.insert(0, SERVICE_ROOT)

from preprocessing.cleaner import load_and_preprocess_uci_diabetes, FEATURE_NAMES

DATA_PATH = os.path.join(SERVICE_ROOT, "data", "raw", "diabetic_data.csv")
MODEL_DIR = os.path.join(SERVICE_ROOT, "models")
EVAL_DIR = os.path.join(SERVICE_ROOT, "evaluation")
MODEL_V1_PATH = os.path.join(MODEL_DIR, "model_v1.0.joblib")
FALLBACK_MODEL_PATH = os.path.join(SERVICE_ROOT, "model_v1.0.joblib")
METRICS_PATH = os.path.join(EVAL_DIR, "metrics.json")
ROOT_METRICS_PATH = os.path.join(SERVICE_ROOT, "metrics.json")


def train_and_evaluate():
    print(f"[1/4] Loading real UCI Diabetes 130-US Hospitals dataset from: {DATA_PATH}")
    X, y = load_and_preprocess_uci_diabetes(DATA_PATH)
    total_samples = len(X)
    positive_cases = int(y.sum())
    print(f"      Total clinical encounters: {total_samples}, 30-day readmissions (<30): {positive_cases} ({positive_cases/total_samples*100:.2f}%)")

    print("[2/4] Splitting dataset into training (80%) and held-out test (20%) sets with stratification...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"      Train encounters: {len(X_train)}, Test encounters: {len(X_test)}")

    print("[3/4] Training RandomForestClassifier (n_estimators=150, max_depth=10, class_weight='balanced')...")
    clf = RandomForestClassifier(
        n_estimators=150,
        max_depth=10,
        min_samples_leaf=5,
        random_state=42,
        class_weight="balanced",
        n_jobs=-1
    )
    clf.fit(X_train, y_train)

    print("[4/4] Evaluating on held-out test cohort...")
    y_pred = clf.predict(X_test)
    y_prob = clf.predict_proba(X_test)[:, 1]

    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred))
    rec = float(recall_score(y_test, y_pred))
    f1 = float(f1_score(y_test, y_pred))
    roc_auc = float(roc_auc_score(y_test, y_prob))
    cm = confusion_matrix(y_test, y_pred).tolist()
    clf_report = classification_report(y_test, y_pred, output_dict=True)

    importances = {
        name: round(float(imp), 4)
        for name, imp in zip(FEATURE_NAMES, clf.feature_importances_)
    }
    sorted_importances = dict(sorted(importances.items(), key=lambda kv: kv[1], reverse=True))

    metrics = {
        "model_name": "readmission-risk",
        "version": "v1.0",
        "algorithm": "RandomForestClassifier",
        "dataset_name": "UCI Diabetes 130-US Hospitals (1999-2008)",
        "features": FEATURE_NAMES,
        "train_size": len(X_train),
        "test_size": len(X_test),
        "total_dataset_size": total_samples,
        "positive_rate": round(float(y.mean()), 4),
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "roc_auc": round(roc_auc, 4),
        "confusion_matrix": cm,
        "classification_report": clf_report,
        "feature_importances": sorted_importances,
        "training_parameters": {
            "n_estimators": 150,
            "max_depth": 10,
            "min_samples_leaf": 5,
            "random_state": 42,
            "class_weight": "balanced"
        },
        "trained_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "limitations": "Model trained on inpatient diabetes encounters from 1999-2008. Advisory clinical decision-support only. Not a medical diagnosis."
    }

    bundle = {
        "model": clf,
        "features": FEATURE_NAMES,
        "version": "v1.0",
        "metrics": metrics
    }

    os.makedirs(MODEL_DIR, exist_ok=True)
    os.makedirs(EVAL_DIR, exist_ok=True)

    joblib.dump(bundle, MODEL_V1_PATH)
    joblib.dump(bundle, FALLBACK_MODEL_PATH)

    with open(METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)
    with open(ROOT_METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)

    print("\n==========================================================")
    print(" MODEL TRAINING & EVALUATION REPORT (UCI DIABETES)")
    print("==========================================================")
    print(f" Model Version:     readmission-risk v1.0")
    print(f" Accuracy:          {metrics['accuracy']}")
    print(f" Precision:         {metrics['precision']}")
    print(f" Recall:            {metrics['recall']}")
    print(f" F1-Score:          {metrics['f1_score']}")
    print(f" ROC-AUC:           {metrics['roc_auc']}")
    print(f" Confusion Matrix:  TN={cm[0][0]}, FP={cm[0][1]}, FN={cm[1][0]}, TP={cm[1][1]}")
    print("\nTop Contributing Features:")
    for feat, imp in list(sorted_importances.items())[:5]:
        print(f" - {feat:25s}: {imp:.4f}")
    print(f"\nArtifact successfully saved to {MODEL_V1_PATH}")
    print("==========================================================")

    return metrics


if __name__ == "__main__":
    train_and_evaluate()

