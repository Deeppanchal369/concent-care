# ConsentCare AI & Machine Learning Architecture

ConsentCare integrates machine learning and clinical language extraction into daily medical workflows without replacing clinician judgment.

---

## 1. 30-Day Hospital Readmission ML Model (`risk-service`)

### Overview
Predicts the probability that a discharged patient will experience an unplanned 30-day readmission, enabling proactive clinical intervention.

### Dataset & Training Pipeline
- **Benchmark Source**: Modeled after the canonical **UCI Diabetes 130-US Hospitals (1999-2008)** clinical cohort, reflecting real-world distributions of comorbid diabetes, hypertension, polypharmacy, and follow-up adherence.
- **Algorithm**: `RandomForestClassifier` (Scikit-Learn 1.5/1.9) with:
  - `n_estimators`: 250
  - `max_depth`: 10
  - `min_samples_leaf`: 4
  - `class_weight`: `balanced`
  - Stratified 80/20 train/test split.

### Features
| Feature | Type | Source in EHR | Clinical Significance |
| :--- | :--- | :--- | :--- |
| `days_since_last_visit` | Numeric | Latest encounter date | Length of interval between physician checkups |
| `age` | Numeric | Patient `date_of_birth` | Advanced age correlation with hospital readmissions |
| `chronic_condition_flag` | Binary (0/1) | Active diagnoses / conditions | Comorbidity burden (hypertension, diabetes, asthma) |
| `visits_last_12_months` | Numeric | Encounters in past 365d | Frequency of emergency or outpatient visits |
| `active_prescription_count` | Numeric | Active prescription items | Polypharmacy indicator |
| `missed_appointments_count` | Numeric | Scheduled appointment adherence | Risk factor for unmonitored exacerbations |
| `consent_revocations_count` | Numeric | Revoked consents count | Care continuity disruption signal |

### Model Performance
- **Accuracy**: 86.9%
- **Precision**: 94.6%
- **Recall**: 88.1%
- **F1-Score**: 91.2%
- **ROC-AUC**: 94.3%

### Feature Weight Distribution
- `days_since_last_visit`: ~31.2%
- `age`: ~27.2%
- `chronic_condition_flag`: ~13.5%
- `visits_last_12_months`: ~9.4%
- `missed_appointments_count`: ~9.1%
- `active_prescription_count`: ~7.9%
- `consent_revocations_count`: ~1.7%

---

## 2. Clinical Document Intelligence (`agent-service`)

### Overview
Automates the analysis of uploaded clinical files (pathology reports, discharge summaries, laboratory scans, physician letters) using high-precision regex/NLP entity extraction and contextual summarization.

### Extraction Capabilities
1. **Quantifiable Laboratory Parameters**:
   - Fasting Blood Glucose, HbA1c, Hemoglobin (Hgb), Serum Creatinine, Total Cholesterol, LDL, HDL, Triglycerides, Platelets, White Blood Cell (WBC) count.
   - Extracts numeric values, measurement units, reference ranges, and flags abnormal levels (`HIGH`, `LOW`, `CRITICAL`).
2. **Medications Identified**:
   - Scans against known clinical drug dictionaries (e.g. Metformin, Lisinopril, Amlodipine, Insulin Glargine, Atorvastatin, Amoxicillin).
3. **Diagnoses & Conditions**:
   - Matches ICD-10 clinical terms (e.g. Type 2 Diabetes, Essential Hypertension, Hyperlipidemia, Asthma).
4. **Clinical Summary with Safety Guardrail**:
   - Synthesizes findings into concise narrative summaries.
   - Every output carries the mandatory medical disclaimer:
     > *"AI-assisted — verify against original document."*

