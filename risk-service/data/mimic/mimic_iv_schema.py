"""
MIMIC-IV v3.1 Schema Specification & Mapping Definitions.
Source: PhysioNet / Beth Israel Deaconess Medical Center (2008–2022).
Reference: Johnson, A. et al. (2023). MIMIC-IV (version 3.1). PhysioNet.
"""

from typing import Dict, List

MIMIC_IV_MODULES: Dict[str, List[str]] = {
    "hosp": [
        "admissions",
        "patients",
        "diagnoses_icd",
        "d_icd_diagnoses",
        "labevents",
        "d_labitems",
        "prescriptions",
        "transfers",
        "services",
        "hcpcsevents",
        "drgcodes",
        "microbiologyevents"
    ],
    "icu": [
        "icustays",
        "chartevents",
        "inputevents",
        "outputevents",
        "procedureevents",
        "datetimeevents",
        "d_items"
    ]
}

MIMIC_IV_COLUMNS: Dict[str, List[str]] = {
    "admissions": [
        "subject_id", "hadm_id", "admittime", "dischtime", "deathtime",
        "admission_type", "admit_provider_id", "admission_location",
        "discharge_location", "insurance", "language", "marital_status",
        "race", "edregtime", "edouttime", "hospital_expire_flag"
    ],
    "patients": [
        "subject_id", "gender", "anchor_age", "anchor_year",
        "anchor_year_group", "dod"
    ],
    "diagnoses_icd": [
        "subject_id", "hadm_id", "seq_num", "icd_code", "icd_version"
    ],
    "labevents": [
        "labevent_id", "subject_id", "hadm_id", "specimen_id", "itemid",
        "order_provider_id", "charttime", "storetime", "value",
        "valuenum", "valueuom", "ref_range_lower", "ref_range_upper",
        "flag", "priority", "comments"
    ],
    "prescriptions": [
        "subject_id", "hadm_id", "pharmacy_id", "starttime", "stoptime",
        "drug_type", "drug", "gsn", "ndc", "prod_strength",
        "form_rx", "dose_val_rx", "dose_unit_rx", "form_val_disp",
        "form_unit_disp", "doses_per_24_hrs", "route"
    ],
    "icustays": [
        "subject_id", "hadm_id", "stay_id", "first_careunit",
        "last_careunit", "intime", "outtime", "los"
    ]
}

# Key Clinical Item IDs for Feature Engineering in MIMIC-IV
CORE_LAB_ITEM_IDS: Dict[str, List[int]] = {
    "glucose": [50809, 50931],
    "creatinine": [50912],
    "blood_urea_nitrogen": [51006],
    "potassium": [50822, 50971],
    "sodium": [50824, 50983],
    "hemoglobin": [51222],
    "white_blood_cells": [51301],
    "platelets": [51265],
    "lactate": [50813],
    "hba1c": [50852]
}

