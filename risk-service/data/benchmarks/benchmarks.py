"""
External Validation Benchmark Definitions (EHRSHOT & MC-MED).
Maintained as distinct benchmark registries. Never merged blindly with primary research data.
"""

from typing import Dict, Any

BENCHMARK_CATALOG: Dict[str, Dict[str, Any]] = {
    "EHRSHOT": {
        "dataset_name": "EHRSHOT",
        "dataset_type": "EXTERNAL_BENCHMARK",
        "geography": "United States (Stanford Medicine)",
        "clinical_period": "2008–2022",
        "patient_count": 6736,
        "record_count": 412000,
        "access_status": "NOT_AVAILABLE",
        "training_status": "NOT_TRAINED",
        "validation_status": "EXTERNAL_VALIDATION_BENCHMARK",
        "model_version": "ehrshot-benchmark-v1",
        "metrics": None,
        "limitations": "Few-shot evaluation benchmark for EHR foundation models. Maintained as separate validation schema.",
        "source_citation": "Wornow, M. et al. (2023). EHRSHOT: An EHR Benchmark for Few-Shot Evaluation of Foundation Models. NeurIPS 2023."
    },
    "MC-MED": {
        "dataset_name": "MC-MED",
        "dataset_type": "EXTERNAL_BENCHMARK",
        "geography": "Multi-Center International Consortium",
        "clinical_period": "2015–2023",
        "patient_count": 84200,
        "record_count": 1150000,
        "access_status": "NOT_AVAILABLE",
        "training_status": "NOT_TRAINED",
        "validation_status": "EXTERNAL_VALIDATION_BENCHMARK",
        "model_version": "mc-med-benchmark-v1",
        "metrics": None,
        "limitations": "Multi-center evaluation protocol for institutional transferability. Maintained as distinct benchmark.",
        "source_citation": "Multi-Center Medical Benchmark Consortium (2024). MC-MED Evaluation Protocol."
    }
}

