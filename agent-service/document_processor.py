import re
import json
from typing import Dict, List, Any, Optional

COMMON_LAB_PATTERNS = [
    {
        "name": "Fasting Blood Glucose",
        "regex": r"(?:glucose|fasting\s*glucose|blood\s*sugar)[^\d]*(\d+(?:\.\d+)?)\s*(mg/dL|mmol/L)?",
        "unit": "mg/dL",
        "low": 70,
        "high": 100,
    },
    {
        "name": "HbA1c",
        "regex": r"(?:hba1c|glycated\s*hemoglobin|a1c)[^\d]*(\d+(?:\.\d+)?)\s*(%)?",
        "unit": "%",
        "low": 4.0,
        "high": 5.6,
    },
    {
        "name": "Hemoglobin",
        "regex": r"(?:hemoglobin|hgb)[^\d]*(\d+(?:\.\d+)?)\s*(g/dL)?",
        "unit": "g/dL",
        "low": 12.0,
        "high": 17.5,
    },
    {
        "name": "Serum Creatinine",
        "regex": r"(?:creatinine|serum\s*creatinine)[^\d]*(\d+(?:\.\d+)?)\s*(mg/dL)?",
        "unit": "mg/dL",
        "low": 0.6,
        "high": 1.2,
    },
    {
        "name": "Total Cholesterol",
        "regex": r"(?:total\s*cholesterol|cholesterol)[^\d]*(\d+(?:\.\d+)?)\s*(mg/dL)?",
        "unit": "mg/dL",
        "low": 100,
        "high": 200,
    },
    {
        "name": "LDL Cholesterol",
        "regex": r"(?:ldl|ldl-c|bad\s*cholesterol)[^\d]*(\d+(?:\.\d+)?)\s*(mg/dL)?",
        "unit": "mg/dL",
        "low": 50,
        "high": 100,
    },
    {
        "name": "HDL Cholesterol",
        "regex": r"(?:hdl|hdl-c|good\s*cholesterol)[^\d]*(\d+(?:\.\d+)?)\s*(mg/dL)?",
        "unit": "mg/dL",
        "low": 40,
        "high": 60,
    },
    {
        "name": "Triglycerides",
        "regex": r"(?:triglycerides|tg)[^\d]*(\d+(?:\.\d+)?)\s*(mg/dL)?",
        "unit": "mg/dL",
        "low": 50,
        "high": 150,
    },
    {
        "name": "Platelets",
        "regex": r"(?:platelets|plt)[^\d]*(\d+(?:,\d+)?)\s*(k/uL|10\^3/uL)?",
        "unit": "k/uL",
        "low": 150,
        "high": 450,
    },
    {
        "name": "WBC Count",
        "regex": r"(?:wbc|white\s*blood\s*cells?)[^\d]*(\d+(?:\.\d+)?)\s*(k/uL)?",
        "unit": "k/uL",
        "low": 4.5,
        "high": 11.0,
    },
]

KNOWN_MEDICATIONS = [
    "Metformin", "Glipizide", "Insulin Glargine", "Lisinopril", "Amlodipine",
    "Losartan", "Atorvastatin", "Simvastatin", "Rosuvastatin", "Omeprazole",
    "Levothyroxine", "Albuterol", "Amoxicillin", "Azithromycin", "Aspirin",
    "Clopidogrel", "Hydrochlorothiazide", "Metoprolol", "Gabapentin"
]

KNOWN_CONDITIONS = [
    "Type 2 Diabetes Mellitus", "Type 1 Diabetes Mellitus", "Essential Hypertension",
    "Hyperlipidemia", "Coronary Artery Disease", "Asthma", "Chronic Kidney Disease",
    "Anemia", "Hypothyroidism", "Gastroesophageal Reflux Disease (GERD)",
    "Acute Bronchitis", "Pneumonia", "Allergic Rhinitis"
]


def extract_clinical_entities(raw_text: str) -> Dict[str, Any]:
    text_lower = raw_text.lower()

    # 1. Tests & lab findings
    findings = []
    abnormalities = []

    for item in COMMON_LAB_PATTERNS:
        match = re.search(item["regex"], text_lower, re.IGNORECASE)
        if match:
            raw_val = match.group(1).replace(",", "")
            try:
                val = float(raw_val)
                unit = match.group(2) if match.lastindex and match.lastindex >= 2 and match.group(2) else item["unit"]
                ref_range = f"{item['low']} - {item['high']} {unit}"

                flag = "NORMAL"
                if val < item["low"]:
                    flag = "LOW"
                    abnormalities.append(f"Low {item['name']}: {val} {unit}")
                elif val > item["high"]:
                    flag = "HIGH"
                    abnormalities.append(f"Elevated {item['name']}: {val} {unit}")

                findings.append({
                    "test_name": item["name"],
                    "value": str(val),
                    "unit": unit,
                    "reference_range": ref_range,
                    "flag": flag,
                })
            except ValueError:
                continue

    # 2. Medications identified
    detected_meds = []
    for med in KNOWN_MEDICATIONS:
        if re.search(rf"\b{re.escape(med.lower())}\b", text_lower):
            detected_meds.append(med)

    # 3. Diagnoses identified
    detected_diagnoses = []
    for cond in KNOWN_CONDITIONS:
        # Match keywords from condition
        kw = cond.lower().split()[0]
        if len(kw) > 3 and re.search(rf"\b{re.escape(kw)}\b", text_lower):
            detected_diagnoses.append(cond)

    return {
        "tests": findings,
        "medications": detected_meds,
        "diagnoses": detected_diagnoses,
        "abnormalities": abnormalities,
    }


def generate_clinical_summary(file_name: str, category: str, entities: Dict[str, Any], raw_text: str) -> str:
    parts = []
    tests = entities.get("tests", [])
    abnormalities = entities.get("abnormalities", [])
    meds = entities.get("medications", [])
    diagnoses = entities.get("diagnoses", [])

    parts.append(f"Document '{file_name}' processed as {category}.")

    if tests:
        parts.append(f"Extracted {len(tests)} quantifiable clinical parameters.")
        if abnormalities:
            parts.append(f"Notable clinical flags: {'; '.join(abnormalities)}.")
        else:
            parts.append("All extracted lab parameters are within expected baseline reference ranges.")
    else:
        parts.append("General clinical documentation without standard laboratory numeric markers.")

    if meds:
        parts.append(f"Referenced therapies/medications: {', '.join(meds)}.")

    if diagnoses:
        parts.append(f"Associated clinical diagnoses: {', '.join(diagnoses)}.")

    return " ".join(parts)

