import re
from typing import Dict, List, Any

LAB_MARKERS = [
    {
        "name": "Fasting Blood Glucose",
        "regex": r"(?:fasting\s*blood\s*glucose|fasting\s*glucose|blood\s*sugar|glucose)[^\d]*(\d+(?:\.\d+)?)\s*(mg/dL|mmol/L)?",
        "unit": "mg/dL",
        "low": 70.0,
        "high": 100.0
    },
    {
        "name": "HbA1c",
        "regex": r"(?:hba1c|glycated\s*hemoglobin|a1c)[^\d]*(\d+(?:\.\d+)?)\s*(%)?",
        "unit": "%",
        "low": 4.0,
        "high": 5.6
    },
    {
        "name": "Hemoglobin",
        "regex": r"(?:hemoglobin|hgb)[^\d]*(\d+(?:\.\d+)?)\s*(g/dL)?",
        "unit": "g/dL",
        "low": 12.0,
        "high": 17.5
    },
    {
        "name": "Serum Creatinine",
        "regex": r"(?:serum\s*creatinine|creatinine)[^\d]*(\d+(?:\.\d+)?)\s*(mg/dL)?",
        "unit": "mg/dL",
        "low": 0.6,
        "high": 1.2
    },
    {
        "name": "Potassium",
        "regex": r"(?:potassium|k\+)[^\d]*(\d+(?:\.\d+)?)\s*(mEq/L|mmol/L)?",
        "unit": "mEq/L",
        "low": 3.5,
        "high": 5.0
    },
    {
        "name": "Sodium",
        "regex": r"(?:sodium|na\+)[^\d]*(\d+(?:\.\d+)?)\s*(mEq/L|mmol/L)?",
        "unit": "mEq/L",
        "low": 135.0,
        "high": 145.0
    },
    {
        "name": "Blood Urea Nitrogen",
        "regex": r"(?:bun|blood\s*urea\s*nitrogen)[^\d]*(\d+(?:\.\d+)?)\s*(mg/dL)?",
        "unit": "mg/dL",
        "low": 7.0,
        "high": 20.0
    },
    {
        "name": "Total Cholesterol",
        "regex": r"(?:total\s*cholesterol|cholesterol)[^\d]*(\d+(?:\.\d+)?)\s*(mg/dL)?",
        "unit": "mg/dL",
        "low": 100.0,
        "high": 200.0
    },
    {
        "name": "LDL Cholesterol",
        "regex": r"(?:ldl|bad\s*cholesterol|ldl-c)[^\d]*(\d+(?:\.\d+)?)\s*(mg/dL)?",
        "unit": "mg/dL",
        "low": 50.0,
        "high": 100.0
    },
    {
        "name": "HDL Cholesterol",
        "regex": r"(?:hdl|good\s*cholesterol|hdl-c)[^\d]*(\d+(?:\.\d+)?)\s*(mg/dL)?",
        "unit": "mg/dL",
        "low": 40.0,
        "high": 60.0
    },
    {
        "name": "Triglycerides",
        "regex": r"(?:triglycerides|tg)[^\d]*(\d+(?:\.\d+)?)\s*(mg/dL)?",
        "unit": "mg/dL",
        "low": 50.0,
        "high": 150.0
    },
    {
        "name": "White Blood Cell Count",
        "regex": r"(?:wbc|white\s*blood\s*cells?)[^\d]*(\d+(?:\.\d+)?)\s*(k/uL|10\^3/uL)?",
        "unit": "k/uL",
        "low": 4.5,
        "high": 11.0
    },
    {
        "name": "Platelets",
        "regex": r"(?:platelets|plt)[^\d]*(\d+(?:,\d+)?)\s*(k/uL|10\^3/uL)?",
        "unit": "k/uL",
        "low": 150.0,
        "high": 450.0
    }
]

KNOWN_MEDS = [
    "Metformin", "Glipizide", "Insulin Glargine", "Insulin Lispro", "Insulin",
    "Lisinopril", "Amlodipine", "Losartan", "Atorvastatin", "Simvastatin",
    "Rosuvastatin", "Omeprazole", "Levothyroxine", "Albuterol", "Amoxicillin",
    "Azithromycin", "Aspirin", "Clopidogrel", "Hydrochlorothiazide", "Metoprolol"
]

KNOWN_CONDITIONS = [
    "Type 2 Diabetes Mellitus", "Type 1 Diabetes Mellitus", "Essential Hypertension",
    "Hyperlipidemia", "Coronary Artery Disease", "Asthma", "Chronic Kidney Disease",
    "Anemia", "Hypothyroidism", "GERD", "Pneumonia", "Acute Bronchitis"
]


class ClinicalEntityExtractor:
    """
    Extracts quantifiable clinical findings, lab results, medications, and conditions
    strictly grounded in the text. Does NOT invent values.
    """

    @classmethod
    def extract(cls, raw_text: str) -> Dict[str, Any]:
        if not raw_text or raw_text == "Not detected":
            return {
                "labResults": [],
                "medications": [],
                "diagnosesMentioned": [],
                "symptomsMentioned": "Not detected",
                "abnormalities": []
            }

        text_lower = raw_text.lower()

        # 1. Laboratory Results
        lab_results = []
        abnormalities = []

        for m in LAB_MARKERS:
            match = re.search(m["regex"], text_lower, re.IGNORECASE)
            if match:
                raw_val = match.group(1).replace(",", "")
                try:
                    val = float(raw_val)
                    unit = match.group(2) if (match.lastindex and match.lastindex >= 2 and match.group(2)) else m["unit"]
                    ref_range = f"{m['low']} - {m['high']} {unit}"

                    flag = "NORMAL"
                    if val < m["low"]:
                        flag = "LOW"
                        abnormalities.append(f"Low {m['name']}: {val} {unit}")
                    elif val > m["high"]:
                        flag = "HIGH"
                        abnormalities.append(f"Elevated {m['name']}: {val} {unit}")

                    lab_results.append({
                        "testName": m["name"],
                        "value": str(val),
                        "unit": unit,
                        "referenceRange": ref_range,
                        "flag": flag
                    })
                except ValueError:
                    continue

        # 2. Medications
        detected_meds = []
        for med in KNOWN_MEDS:
            if re.search(rf"\b{re.escape(med.lower())}\b", text_lower):
                detected_meds.append(med)

        # 3. Diagnoses
        detected_diagnoses = []
        for cond in KNOWN_CONDITIONS:
            kw = cond.lower().split()[0]
            if len(kw) > 3 and re.search(rf"\b{re.escape(kw)}\b", text_lower):
                detected_diagnoses.append(cond)

        # 4. Symptoms (strictly grounded, filtering out negated mentions)
        symptoms = "Not detected"
        symptom_patterns = ["chest pain", "shortness of breath", "fatigue", "fever", "cough", "dizziness", "nausea"]
        found_sym = []
        for s in symptom_patterns:
            matches = list(re.finditer(rf"\b{re.escape(s)}\b", text_lower))
            for m in matches:
                start = max(0, m.start() - 30)
                prefix = text_lower[start:m.start()]
                # Check for negation in the immediate prefix
                if not any(neg in prefix for neg in ["no ", "denies ", "denied ", "without ", "negative for ", "ruled out "]):
                    found_sym.append(s)
                    break
        if found_sym:
            symptoms = ", ".join(found_sym).capitalize()

        return {
            "labResults": lab_results,
            "medications": detected_meds,
            "diagnosesMentioned": detected_diagnoses,
            "symptomsMentioned": symptoms,
            "abnormalities": abnormalities
        }

