# ConsentCare EHR — Machine Learning Patient Risk Architecture

## 1. Dataset & Clinical Problem Definition

The clinical risk prediction engine evaluates the probability of **30-day hospital readmission** using a supervised ensemble model trained on authentic clinical data:

- **Dataset**: UCI Diabetes 130-US Hospitals Dataset (1999–2008).
- **Cohort Size**: 101,766 genuine clinical inpatient admissions across 130 medical centers.
- **Target Variable**: Binary readmission status:
  - `1`: Patient was readmitted within 30 days of discharge (`readmitted == '<30'`).
  - `0`: Patient was readmitted after 30 days or not readmitted (`readmitted == '>30' | 'NO'`).
- **Clinical Significance**: Early identification of patients at high risk of rapid readmission allows care teams to intensify outpatient follow-ups, adjust medications, and establish targeted care plans.

---

## 2. Feature Engineering & Clinical Schema

The model utilizes 12 structured clinical features extracted directly from longitudinal EHR records:

| Feature Name | Type | Description |
| :--- | :--- | :--- |
| `age_group` | Categorical / Ordinal | Grouped patient age bracket (e.g. `[70-80)`, `[50-60)`) |
| `time_in_hospital` | Integer | Total length of stay in days |
| `num_lab_procedures` | Integer | Number of distinct diagnostic laboratory tests performed |
| `num_procedures` | Integer | Number of clinical and surgical procedures performed |
| `num_medications` | Integer | Number of distinct prescribed medications administered |
| `number_outpatient` | Integer | Count of outpatient clinic visits in prior 12 months |
| `number_emergency` | Integer | Count of emergency room encounters in prior 12 months |
| `number_inpatient` | Integer | Count of prior hospital admissions in prior 12 months |
| `number_diagnoses` | Integer | Total count of documented ICD diagnoses |
| `diabetesMed` | Binary (0/1) | Active administration of antidiabetic medication |
| `change` | Binary (0/1) | Change or titration in diabetic medication dosage |
| `gender` | Categorical | Demographic clinical stratification |

---

## 3. Supervised Model Architecture & Performance

- **Algorithm**: `RandomForestClassifier` (Scikit-Learn 1.5.2)
- **Hyperparameters**:
  - `n_estimators`: 100 decision trees
  - `max_depth`: 12 (prevents overfitting to idiosyncratic hospital artifacts)
  - `min_samples_split`: 10
  - `min_samples_leaf`: 5
  - `class_weight`: `balanced` (compensates for standard ~11% clinical readmission prevalence)
  - `random_state`: 42 (deterministic reproducibility)

### Evaluation Metrics (Held-out 20% Test Split: 20,354 encounters)
- **Accuracy**: 0.6898 (69.0%)
- **ROC-AUC**: 0.6478
- **Recall (Readmitted <30d)**: 0.4725 (47.3% sensitivity on high-risk patients)
- **Precision**: 0.1702
- **F1-Score**: 0.2503

---

## 4. Zero-Fabrication Clinical Integrity

A core safety principle of ConsentCare is **Zero Synthetic Data Imputation**:
1. When evaluating a real patient, `core-service` calculates features strictly from verified database records:
   - `age_group` is calculated from the patient's real `date_of_birth`.
   - Prior admissions, medications, and diagnoses are counted from active encounters and prescriptions.
2. If vital records are missing (e.g., patient has no recorded date of birth or no longitudinal encounters), the system does NOT substitute default averages (such as `age=45` or `days=30`).
3. The system halts inference and returns:
   - `status`: `INSUFFICIENT_DATA`
   - `risk_label`: `INSUFFICIENT_DATA`
   - `message`: `"Insufficient information for this research risk assessment."`
   - `data_completeness`: `INCOMPLETE`
4. The clinician UI renders an amber informational advisory detailing which records are required.

