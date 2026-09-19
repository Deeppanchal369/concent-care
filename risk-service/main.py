import os
import sys
import json
from typing import Dict, Optional, Any, List

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from preprocessing.cleaner import FEATURE_NAMES
from inference.adapter import PatientFeatureAdapter
from training.train_risk_model import (
    train_and_evaluate, MODEL_V1_PATH, FALLBACK_MODEL_PATH, METRICS_PATH, ROOT_METRICS_PATH
)

app = FastAPI(
    title="ConsentCare Clinical Risk Service",
    version="1.0.0",
    description="Supervised Machine Learning clinical readmission risk service trained on the UCI Diabetes 130-US Hospitals cohort."
)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

_bundle = None
_metrics = None


def _load_model():
    global _bundle, _metrics
    target_path = MODEL_V1_PATH if os.path.exists(MODEL_V1_PATH) else FALLBACK_MODEL_PATH
    if not os.path.exists(target_path):
        train_and_evaluate()
        target_path = MODEL_V1_PATH

    _bundle = joblib.load(target_path)

    metrics_file = METRICS_PATH if os.path.exists(METRICS_PATH) else ROOT_METRICS_PATH
    if os.path.exists(metrics_file):
        with open(metrics_file) as f:
            _metrics = json.load(f)


@app.on_event("startup")
def startup_event():
    _load_model()


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "risk-service",
        "model_loaded": _bundle is not None,
        "model_name": "readmission-risk",
        "model_version": _bundle.get("version", "v1.0") if _bundle else None,
        "dataset": "UCI Diabetes 130-US Hospitals"
    }


@app.get("/model/metrics")
def model_metrics():
    if _metrics is None:
        metrics_file = METRICS_PATH if os.path.exists(METRICS_PATH) else ROOT_METRICS_PATH
        if os.path.exists(metrics_file):
            with open(metrics_file) as f:
                return json.load(f)
        raise HTTPException(status_code=404, detail="Model evaluation metrics not available yet.")
    return _metrics


@app.post("/predict")
def predict(payload: Dict[str, Any]):
    if _bundle is None:
        raise HTTPException(status_code=503, detail="Risk prediction model is not loaded.")

    patient_id = str(payload.get("patient_id", ""))

    # 1. Feature Adapter: validate completeness and map patient features without fabrication
    is_sufficient, adapter_res = PatientFeatureAdapter.adapt(payload)
    if not is_sufficient:
        return {
            "patient_id": patient_id,
            "status": "INSUFFICIENT_DATA",
            "model_version": "readmission-risk v1.0",
            "risk_probability": None,
            "risk_label": "INSUFFICIENT_DATA",
            "top_contributing_factors": {},
            "data_completeness": adapter_res.get("data_completeness", "PARTIAL"),
            "missing_features": adapter_res.get("missing_features", []),
            "message": adapter_res.get("message"),
            "clinical_disclaimer": "Research decision-support only. This is not a diagnosis or treatment recommendation."
        }

    # 2. Run Random Forest inference on validated features
    model = _bundle["model"]
    df_row = adapter_res["df_row"]

    proba = float(model.predict_proba(df_row)[0][1])

    # Calibrated readmission risk tiers based on UCI Diabetes cohort distribution (~11.2% base rate)
    if proba >= 0.35:
        label = "HIGH"
    elif proba >= 0.18:
        label = "MODERATE"
    else:
        label = "LOW"

    # Extract top contributing factors based on feature importances
    importances = dict(zip(FEATURE_NAMES, model.feature_importances_))
    top_factors = dict(sorted(importances.items(), key=lambda kv: kv[1], reverse=True)[:5])

    return {
        "patient_id": patient_id,
        "status": "COMPLETED",
        "model_version": "readmission-risk v1.0",
        "risk_probability": round(proba, 4),
        "risk_label": label,
        "top_contributing_factors": {k: round(float(v), 4) for k, v in top_factors.items()},
        "features_used": adapter_res.get("mapped_features", {}),
        "data_completeness": "COMPLETE",
        "clinical_disclaimer": "Research decision-support only. This is not a diagnosis or treatment recommendation."
    }


@app.post("/model/retrain")
def retrain():
    metrics = train_and_evaluate()
    _load_model()
    return {"status": "retrained", "metrics": metrics}
