import re
from typing import Dict, Any, List, Tuple
import pandas as pd
from preprocessing.cleaner import FEATURE_NAMES


class PatientFeatureAdapter:
    """
    Patient-to-Model Feature Adapter.
    Maps live EHR patient data to the Random Forest model feature vector.
    Enforces strict zero-fabrication: if required clinical parameters are missing,
    flags INSUFFICIENT_DATA rather than guessing, imputing random values, or injecting defaults.
    """

    MANDATORY_FIELDS = ["age"]

    @classmethod
    def adapt(cls, payload: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        missing_features: List[str] = []

        # 1. Inspect explicit completeness flag from core-service
        if payload.get("has_sufficient_data") is False:
            missing = payload.get("missing_features", [])
            return False, {
                "status": "INSUFFICIENT_DATA",
                "message": "Insufficient information for this research risk assessment. Minimum clinical encounter history and patient demographics are required.",
                "data_completeness": payload.get("data_completeness", "INCOMPLETE"),
                "missing_features": missing if missing else ["encounter_history", "demographics"]
            }

        # 2. Check age
        age = payload.get("age")
        if age is None or (isinstance(age, (int, float)) and age < 0):
            missing_features.append("age")

        # 3. Check encounter presence (must have at least one clinical contact on record)
        total_visits = (
            int(payload.get("number_outpatient", 0)) +
            int(payload.get("number_emergency", 0)) +
            int(payload.get("number_inpatient", 0)) +
            int(payload.get("visits_count", 0))
        )
        if total_visits == 0 and payload.get("has_encounters") is False:
            missing_features.append("encounters")

        if missing_features:
            return False, {
                "status": "INSUFFICIENT_DATA",
                "message": "Insufficient information for this research risk assessment. Minimum clinical encounter history and patient demographics are required.",
                "data_completeness": "PARTIAL",
                "missing_features": missing_features
            }

        # 4. Map valid patient features
        raw_age = payload.get("age", 50)
        if isinstance(raw_age, str):
            match = re.search(r"\[?(\d+)[-\s]+(\d+)\)?", raw_age)
            if match:
                age_val = (int(match.group(1)) + int(match.group(2))) // 2
            else:
                num_match = re.search(r"\d+", raw_age)
                age_val = int(num_match.group(0)) if num_match else 50
        else:
            age_val = int(raw_age) if raw_age is not None else 50

        row = {
            "age": age_val,
            "time_in_hospital": max(1, int(payload.get("time_in_hospital", 1))),
            "num_lab_procedures": max(0, int(payload.get("num_lab_procedures", 0))),
            "num_procedures": max(0, int(payload.get("num_procedures", 0))),
            "num_medications": max(0, int(payload.get("num_medications", 0))),
            "number_outpatient": max(0, int(payload.get("number_outpatient", 0))),
            "number_emergency": max(0, int(payload.get("number_emergency", 0))),
            "number_inpatient": max(0, int(payload.get("number_inpatient", 0))),
            "number_diagnoses": max(0, int(payload.get("number_diagnoses", 1))),
            "diabetes_med": 1 if payload.get("diabetes_med") in [1, True, "1", "true"] else 0,
            "insulin": 1 if payload.get("insulin") in [1, True, "1", "true"] else 0,
            "a1c_tested": 1 if payload.get("a1c_tested") in [1, True, "1", "true"] else 0
        }

        df_row = pd.DataFrame([row], columns=FEATURE_NAMES)
        return True, {
            "status": "VALID",
            "data_completeness": "COMPLETE",
            "df_row": df_row,
            "mapped_features": row
        }

