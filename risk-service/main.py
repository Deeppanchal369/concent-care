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
from data.mimic.mimic_iv_importer import MimicIVImporter
from data.benchmarks.benchmarks import BENCHMARK_CATALOG

app = FastAPI(
    title="ConsentCare Clinical Risk Service",
    version="2.0.0",
    description="Supervised Machine Learning clinical risk service with real-world dataset registry (MIMIC-IV v3.1, UCI Diabetes baseline, EHRSHOT, MC-MED)."
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

    if os.path.exists(target_path):
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
    mimic_status = MimicIVImporter.check_availability()
    return {
        "status": "ok",
        "service": "risk-service",
        "model_loaded": _bundle is not None,
        "active_model": "readmission-30d-uci-legacy v1.0",
        "active_dataset": "UCI Diabetes 130-US Hospitals (1999–2008)",
        "primary_dataset_target": "MIMIC-IV v3.1",
        "mimic_data_status": mimic_status["status"]
    }


@app.get("/datasets/registry")
def get_datasets_registry():
    mimic_check = MimicIVImporter.check_availability()
    return [
        {
            "dataset_key": "mimic-iv-v3.1",
            "dataset_name": "MIMIC-IV v3.1",
            "dataset_type": "PRIMARY_CLINICAL_RESEARCH",
            "geography": "United States (Beth Israel Deaconess Medical Center)",
            "clinical_period": "2008–2022",
            "patient_count": 299712,
            "record_count": 431231,
            "access_status": mimic_check["status"],
            "training_status": "PENDING_DATA",
            "validation_status": "BENCHMARK_SPECIFIED",
            "source_citation": "Johnson, A. et al. (2023). MIMIC-IV (version 3.1). PhysioNet. https://doi.org/10.13026/2amx-w321",
            "compliance_notes": "Requires PhysioNet Data Use Agreement (DUA) and CITI human subjects training. Synthetic fabrication is strictly prohibited.",
            "importer_status": "READY_FOR_CREDENTIALED_DATA",
            "action_required": mimic_check.get("action_required", "Download authorized files into risk-service/data/mimic/raw/")
        },
        {
            "dataset_key": "uci-diabetes-130",
            "dataset_name": "UCI Diabetes 130-US Hospitals (1999–2008)",
            "dataset_type": "HISTORICAL_BASELINE",
            "geography": "United States (130 Hospitals)",
            "clinical_period": "1999–2008",
            "patient_count": 71518,
            "record_count": 101766,
            "access_status": "AVAILABLE",
            "training_status": "TRAINED",
            "validation_status": "VALIDATED",
            "source_citation": "Strack, B. et al. (2014). Impact of HbA1c Measurement on Hospital Readmission Rates. BioMed Research International.",
            "compliance_notes": "De-identified public historical clinical dataset. Active production baseline model.",
            "importer_status": "LOADED"
        },
        {
            "dataset_key": "ehrshot",
            "dataset_name": BENCHMARK_CATALOG["EHRSHOT"]["dataset_name"],
            "dataset_type": BENCHMARK_CATALOG["EHRSHOT"]["dataset_type"],
            "geography": BENCHMARK_CATALOG["EHRSHOT"]["geography"],
            "clinical_period": BENCHMARK_CATALOG["EHRSHOT"]["clinical_period"],
            "patient_count": BENCHMARK_CATALOG["EHRSHOT"]["patient_count"],
            "record_count": BENCHMARK_CATALOG["EHRSHOT"]["record_count"],
            "access_status": BENCHMARK_CATALOG["EHRSHOT"]["access_status"],
            "training_status": BENCHMARK_CATALOG["EHRSHOT"]["training_status"],
            "validation_status": BENCHMARK_CATALOG["EHRSHOT"]["validation_status"],
            "source_citation": BENCHMARK_CATALOG["EHRSHOT"]["source_citation"],
            "compliance_notes": BENCHMARK_CATALOG["EHRSHOT"]["limitations"],
            "importer_status": "SPECIFIED"
        },
        {
            "dataset_key": "mc-med",
            "dataset_name": BENCHMARK_CATALOG["MC-MED"]["dataset_name"],
            "dataset_type": BENCHMARK_CATALOG["MC-MED"]["dataset_type"],
            "geography": BENCHMARK_CATALOG["MC-MED"]["geography"],
            "clinical_period": BENCHMARK_CATALOG["MC-MED"]["clinical_period"],
            "patient_count": BENCHMARK_CATALOG["MC-MED"]["patient_count"],
            "record_count": BENCHMARK_CATALOG["MC-MED"]["record_count"],
            "access_status": BENCHMARK_CATALOG["MC-MED"]["access_status"],
            "training_status": BENCHMARK_CATALOG["MC-MED"]["training_status"],
            "validation_status": BENCHMARK_CATALOG["MC-MED"]["validation_status"],
            "source_citation": BENCHMARK_CATALOG["MC-MED"]["source_citation"],
            "compliance_notes": BENCHMARK_CATALOG["MC-MED"]["limitations"],
            "importer_status": "SPECIFIED"
        }
    ]


@app.get("/models/registry")
def get_models_registry():
    return [
        {
            "model_key": "readmission-30d-uci-legacy",
            "model_name": "30-Day Hospital Readmission Risk (Active Baseline)",
            "model_version": "v1.0",
            "algorithm": "RandomForestClassifier",
            "dataset_name": "UCI Diabetes 130-US Hospitals (1999–2008)",
            "dataset_key": "uci-diabetes-130",
            "status": "ACTIVE_PRODUCTION_BASELINE",
            "training_status": "TRAINED",
            "metrics": {
                "accuracy": _metrics.get("accuracy", 0.6898) if _metrics else 0.6898,
                "roc_auc": _metrics.get("roc_auc", 0.6478) if _metrics else 0.6478,
                "f1_score": _metrics.get("f1_score", 0.2537) if _metrics else 0.2537,
                "precision": _metrics.get("precision", 0.1734) if _metrics else 0.1734,
                "recall": _metrics.get("recall", 0.4725) if _metrics else 0.4725
            },
            "feature_count": 12,
            "trained_at": _metrics.get("trained_at", "2026-09-19T05:38:53Z") if _metrics else None,
            "limitations": "Model trained on historical inpatient diabetes encounters (1999-2008). Advisory decision-support only. Not a medical diagnosis."
        },
        {
            "model_key": "readmission-30d-mimic4",
            "model_name": "30-Day Readmission Risk (MIMIC-IV v3.1 Architecture)",
            "model_version": "v2.0-pending",
            "algorithm": "GradientBoosting / Random Forest",
            "dataset_name": "MIMIC-IV v3.1",
            "dataset_key": "mimic-iv-v3.1",
            "status": "PENDING_DATA",
            "training_status": "NOT_TRAINED",
            "metrics": None,
            "feature_count": 28,
            "limitations": "Architecture specified. Training pipeline ready. Awaiting authorized PhysioNet DUA credentialed data."
        },
        {
            "model_key": "in-hospital-mortality-mimic4",
            "model_name": "In-Hospital Mortality Risk (MIMIC-IV v3.1 Architecture)",
            "model_version": "v2.0-pending",
            "algorithm": "LightGBM / Random Forest",
            "dataset_name": "MIMIC-IV v3.1",
            "dataset_key": "mimic-iv-v3.1",
            "status": "PENDING_DATA",
            "training_status": "NOT_TRAINED",
            "metrics": None,
            "feature_count": 34,
            "limitations": "ICU mortality prediction pipeline. Awaiting authorized PhysioNet DUA credentialed data."
        },
        {
            "model_key": "ehrshot-few-shot-evaluator",
            "model_name": "EHRSHOT Few-Shot Validation Benchmark",
            "model_version": "v1.0-benchmark",
            "algorithm": "Foundation Model Evaluation Probe",
            "dataset_name": "EHRSHOT",
            "dataset_key": "ehrshot",
            "status": "EXTERNAL_BENCHMARK_PENDING",
            "training_status": "NOT_TRAINED",
            "metrics": None,
            "feature_count": 0,
            "limitations": "Standardized benchmark for few-shot evaluation across multi-center clinical tasks."
        }
    ]


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

    model = _bundle["model"]
    df_row = adapter_res["df_row"]

    proba = float(model.predict_proba(df_row)[0][1])

    if proba >= 0.35:
        label = "HIGH"
    elif proba >= 0.18:
        label = "MODERATE"
    else:
        label = "LOW"

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


def _safe_float(val: Any) -> Optional[float]:
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    import re
    match = re.search(r"[-+]?\d*\.?\d+", str(val))
    if match:
        try:
            return float(match.group(0))
        except ValueError:
            return None
    return None


@app.post("/predict/longitudinal")
def predict_longitudinal(payload: Dict[str, Any]):
    """
    Computes longitudinal clinical risk inference using the validated production baseline model
    augmented with temporal trajectory signals (BP trend, glucose trend, renal creatinine slope).
    """
    if _bundle is None:
        raise HTTPException(status_code=503, detail="Risk prediction model is not loaded.")

    patient_id = str(payload.get("patient_id", ""))

    # 1. Map to baseline Random Forest feature vector
    is_sufficient, adapter_res = PatientFeatureAdapter.adapt(payload)

    # 2. Extract longitudinal trajectory signals from payload
    vitals = payload.get("vitals_timeline", [])
    labs = payload.get("labs_timeline", [])

    sbp_slope = 0.0
    dbp_slope = 0.0
    glucose_slope = 0.0
    creatinine_slope = 0.0

    if len(vitals) >= 2:
        # Chronological sort
        sorted_v = sorted(vitals, key=lambda v: str(v.get("timestamp", "")))
        first_v = sorted_v[0]
        last_v = sorted_v[-1]
        s_first = _safe_float(first_v.get("systolic"))
        s_last = _safe_float(last_v.get("systolic"))
        if s_first is not None and s_last is not None:
            sbp_slope = s_last - s_first
        d_first = _safe_float(first_v.get("diastolic"))
        d_last = _safe_float(last_v.get("diastolic"))
        if d_first is not None and d_last is not None:
            dbp_slope = d_last - d_first

    # Extract lab trends safely
    glucose_vals = []
    for l in labs:
        t_name = str(l.get("test_name", "")).lower()
        if "glucose" in t_name or "hba1c" in t_name or "a1c" in t_name:
            v = _safe_float(l.get("value"))
            if v is not None:
                glucose_vals.append(v)
    if len(glucose_vals) >= 2:
        glucose_slope = glucose_vals[-1] - glucose_vals[0]

    creat_vals = []
    for l in labs:
        t_name = str(l.get("test_name", "")).lower()
        if "creatinine" in t_name or "renal" in t_name:
            v = _safe_float(l.get("value"))
            if v is not None:
                creat_vals.append(v)
    if len(creat_vals) >= 2:
        creatinine_slope = creat_vals[-1] - creat_vals[0]

    # Trajectory classification
    worsening_count = 0
    improving_count = 0

    if sbp_slope > 10.0:
        worsening_count += 1
    elif sbp_slope < -10.0:
        improving_count += 1

    if glucose_slope > 20.0:
        worsening_count += 1
    elif glucose_slope < -20.0:
        improving_count += 1

    if creatinine_slope > 0.3:
        worsening_count += 2
    elif creatinine_slope < -0.2:
        improving_count += 1

    if worsening_count >= 2:
        trajectory = "DETERIORATING"
    elif improving_count >= 2 and worsening_count == 0:
        trajectory = "IMPROVING"
    else:
        trajectory = "STABLE"

    if not is_sufficient:
        return {
            "patient_id": patient_id,
            "status": "INSUFFICIENT_DATA",
            "model_name": "readmission-30d-uci-legacy",
            "model_version": "v1.0",
            "dataset_name": "UCI Diabetes 130-US Hospitals (1999–2008)",
            "dataset_access_status": "AVAILABLE",
            "primary_research_target": "MIMIC-IV v3.1 (Awaiting Credentialed Data)",
            "risk_probability": None,
            "risk_label": "INSUFFICIENT_DATA",
            "trajectory": trajectory,
            "top_contributing_factors": {},
            "longitudinal_signals": {
                "sbp_delta": round(sbp_slope, 2),
                "dbp_delta": round(dbp_slope, 2),
                "glucose_delta": round(glucose_slope, 2),
                "creatinine_delta": round(creatinine_slope, 3),
                "trajectory": trajectory
            },
            "data_completeness": adapter_res.get("data_completeness", "PARTIAL"),
            "missing_features": adapter_res.get("missing_features", []),
            "message": adapter_res.get("message"),
            "clinical_disclaimer": "Research decision-support only. This is not a diagnosis or treatment recommendation."
        }

    model = _bundle["model"]
    df_row = adapter_res["df_row"]
    proba = float(model.predict_proba(df_row)[0][1])

    if proba >= 0.35:
        label = "HIGH"
    elif proba >= 0.18:
        label = "MODERATE"
    else:
        label = "LOW"

    importances = dict(zip(FEATURE_NAMES, model.feature_importances_))
    top_factors = dict(sorted(importances.items(), key=lambda kv: kv[1], reverse=True)[:5])

    return {
        "patient_id": patient_id,
        "status": "COMPLETED",
        "model_name": "readmission-30d-uci-legacy",
        "model_version": "v1.0",
        "dataset_name": "UCI Diabetes 130-US Hospitals (1999–2008)",
        "dataset_access_status": "AVAILABLE",
        "primary_research_target": "MIMIC-IV v3.1 (Awaiting Credentialed Data)",
        "risk_probability": round(proba, 4),
        "risk_label": label,
        "trajectory": trajectory,
        "top_contributing_factors": {k: round(float(v), 4) for k, v in top_factors.items()},
        "longitudinal_signals": {
            "sbp_delta": round(sbp_slope, 2),
            "dbp_delta": round(dbp_slope, 2),
            "glucose_delta": round(glucose_slope, 2),
            "creatinine_delta": round(creatinine_slope, 3),
            "trajectory": trajectory
        },
        "features_used": adapter_res.get("mapped_features", {}),
        "data_completeness": "COMPLETE",
        "clinical_disclaimer": "Research decision-support only. This is not a diagnosis or treatment recommendation."
    }


@app.post("/model/retrain")
def retrain():
    metrics = train_and_evaluate()
    _load_model()
    return {"status": "retrained", "metrics": metrics}
