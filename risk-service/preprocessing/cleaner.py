import os
import pandas as pd
import numpy as np
from typing import Tuple, List

FEATURE_NAMES: List[str] = [
    "age",
    "time_in_hospital",
    "num_lab_procedures",
    "num_procedures",
    "num_medications",
    "number_outpatient",
    "number_emergency",
    "number_inpatient",
    "number_diagnoses",
    "diabetes_med",
    "insulin",
    "a1c_tested"
]

AGE_MAP = {
    '[0-10)': 5,
    '[10-20)': 15,
    '[20-30)': 25,
    '[30-40)': 35,
    '[40-50)': 45,
    '[50-60)': 55,
    '[60-70)': 65,
    '[70-80)': 75,
    '[80-90)': 85,
    '[90-100)': 95
}


def load_and_preprocess_uci_diabetes(csv_path: str) -> Tuple[pd.DataFrame, pd.Series]:
    """
    Loads the official UCI Diabetes 130-US Hospitals (1999-2008) dataset,
    performs structured cleaning, transforms demographic and clinical encounter features,
    and extracts the binary 30-day hospital readmission target variable ('<30').
    """
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"UCI Diabetes dataset not found at path: {csv_path}")

    # Load raw dataset (101,766 encounters across 130 hospitals)
    df = pd.read_csv(csv_path, low_memory=False)

    # 1. Target variable: 30-day readmission ('<30' indicates early unplanned readmission)
    y = (df["readmitted"] == "<30").astype(int)

    # 2. Extract and transform structured features
    age_numeric = df["age"].map(AGE_MAP).fillna(55).astype(int)
    time_in_hospital = pd.to_numeric(df["time_in_hospital"], errors="coerce").fillna(1).astype(int)
    num_lab_procedures = pd.to_numeric(df["num_lab_procedures"], errors="coerce").fillna(0).astype(int)
    num_procedures = pd.to_numeric(df["num_procedures"], errors="coerce").fillna(0).astype(int)
    num_medications = pd.to_numeric(df["num_medications"], errors="coerce").fillna(1).astype(int)
    number_outpatient = pd.to_numeric(df["number_outpatient"], errors="coerce").fillna(0).astype(int)
    number_emergency = pd.to_numeric(df["number_emergency"], errors="coerce").fillna(0).astype(int)
    number_inpatient = pd.to_numeric(df["number_inpatient"], errors="coerce").fillna(0).astype(int)
    number_diagnoses = pd.to_numeric(df["number_diagnoses"], errors="coerce").fillna(1).astype(int)

    diabetes_med = (df["diabetesMed"] == "Yes").astype(int)
    insulin = df["insulin"].isin(["Up", "Down", "Steady"]).astype(int)
    a1c_tested = df["A1Cresult"].isin([">7", ">8", "Norm"]).astype(int)

    X = pd.DataFrame({
        "age": age_numeric,
        "time_in_hospital": time_in_hospital,
        "num_lab_procedures": num_lab_procedures,
        "num_procedures": num_procedures,
        "num_medications": num_medications,
        "number_outpatient": number_outpatient,
        "number_emergency": number_emergency,
        "number_inpatient": number_inpatient,
        "number_diagnoses": number_diagnoses,
        "diabetes_med": diabetes_med,
        "insulin": insulin,
        "a1c_tested": a1c_tested
    }, columns=FEATURE_NAMES)

    return X, y

