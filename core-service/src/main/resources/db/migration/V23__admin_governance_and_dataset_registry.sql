-- V23__admin_governance_and_dataset_registry.sql
-- Real-World Clinical Dataset Registry, Model Registry, Admin Document Governance, and Clinical Intelligence Runs

-- 1. Dataset Registry (Real-World Clinical Datasets & External Benchmarks)
CREATE TABLE dataset_registry (
    id                  BIGSERIAL PRIMARY KEY,
    dataset_name        VARCHAR(150) NOT NULL UNIQUE,
    dataset_type        VARCHAR(50) NOT NULL, -- REAL_DEIDENTIFIED_EHR, HISTORICAL_CLINICAL_COHORT, EXTERNAL_BENCHMARK
    geography           VARCHAR(100) NOT NULL,
    clinical_period     VARCHAR(50) NOT NULL,
    patient_count       BIGINT NOT NULL,
    record_count        BIGINT NOT NULL,
    access_status       VARCHAR(40) NOT NULL, -- AVAILABLE, REQUIRES_CREDENTIALED_DATA, NOT_AVAILABLE
    training_status     VARCHAR(30) NOT NULL, -- TRAINED, NOT_TRAINED
    validation_status   VARCHAR(50) NOT NULL,
    model_version       VARCHAR(50) NOT NULL,
    metrics_json        TEXT,
    limitations         TEXT NOT NULL,
    source_citation     TEXT NOT NULL,
    is_primary_research BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Model Registry (Governed Clinical Models)
CREATE TABLE model_registry (
    id                      BIGSERIAL PRIMARY KEY,
    model_key               VARCHAR(100) NOT NULL UNIQUE,
    model_name              VARCHAR(150) NOT NULL,
    version                 VARCHAR(50) NOT NULL,
    algorithm               VARCHAR(100) NOT NULL,
    dataset_name            VARCHAR(150) NOT NULL REFERENCES dataset_registry(dataset_name) ON DELETE RESTRICT,
    target_name             VARCHAR(100) NOT NULL,
    prediction_horizon      VARCHAR(50) NOT NULL,
    features_json           TEXT NOT NULL,
    metrics_json            TEXT,
    feature_importances_json TEXT,
    limitations             TEXT NOT NULL,
    status                  VARCHAR(30) NOT NULL, -- TRAINED, PENDING_DATA, UNSUPPORTED
    trained_at              TIMESTAMPTZ
);

-- 3. Admin Document Governance Columns
ALTER TABLE documents ADD COLUMN IF NOT EXISTS admin_status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_admin_status_check;
ALTER TABLE documents ADD CONSTRAINT documents_admin_status_check
    CHECK (admin_status IN ('ACTIVE', 'UNDER_REVIEW', 'REMOVED_BY_ADMIN', 'ARCHIVED', 'RESTORED'));

ALTER TABLE documents ADD COLUMN IF NOT EXISTS removal_reason TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS removed_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS restored_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS restored_at TIMESTAMPTZ;

-- 4. Admin Document Actions (Audit of administrative access, views, removals, and restorations)
CREATE TABLE admin_document_actions (
    id                      BIGSERIAL PRIMARY KEY,
    document_id             BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    admin_user_id           BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type             VARCHAR(50) NOT NULL, -- VIEW_METADATA, VIEW_CONTENT, DOWNLOAD, REMOVE, RESTORE
    administrative_reason   TEXT NOT NULL,
    timestamp               TIMESTAMPTZ NOT NULL DEFAULT now(),
    result                  VARCHAR(20) NOT NULL DEFAULT 'SUCCESS'
);

CREATE INDEX idx_admin_doc_actions_doc ON admin_document_actions(document_id);
CREATE INDEX idx_admin_doc_actions_admin ON admin_document_actions(admin_user_id);
CREATE INDEX idx_admin_doc_actions_time ON admin_document_actions(timestamp DESC);

-- 5. Longitudinal Clinical Intelligence Runs
CREATE TABLE clinical_intelligence_runs (
    id                          BIGSERIAL PRIMARY KEY,
    patient_id                  BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    requested_by_user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    generated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    data_coverage_json          TEXT NOT NULL,
    historical_summary_json     TEXT NOT NULL,
    current_status_json         TEXT NOT NULL,
    trends_json                 TEXT NOT NULL,
    risk_signals_json           TEXT NOT NULL,
    symptoms_to_monitor_json    TEXT NOT NULL,
    missing_data_json           TEXT,
    limitations_json            TEXT NOT NULL,
    model_version               VARCHAR(50) NOT NULL,
    requires_clinical_review    BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_clinical_intel_patient ON clinical_intelligence_runs(patient_id, generated_at DESC);

-- 6. Notification Type Expansion for Transparent Document Governance
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'ACCESS_REQUEST', 'ACCESS_APPROVED', 'ACCESS_REVOKED',
    'NEW_REPORT', 'NEW_PRESCRIPTION', 'DOCTOR_INSTRUCTION',
    'NURSE_ASSIGNMENT', 'TASK_COMPLETED', 'AI_PROCESSING_FINISHED',
    'RISK_ASSESSMENT',
    'CONSENT_GRANTED', 'CONSENT_EXPIRING', 'CONSENT_EXPIRED', 'CONSENT_REVOKED',
    'LAB_RESULT_READY', 'LAB_ORDERED',
    'DOCUMENT_REMOVED_BY_ADMIN', 'DOCUMENT_RESTORED', 'ADMIN_ALERT'
));

-- 7. Seed Real-World Datasets & Benchmarks into Dataset Registry
INSERT INTO dataset_registry (
    dataset_name, dataset_type, geography, clinical_period, patient_count, record_count,
    access_status, training_status, validation_status, model_version, metrics_json,
    limitations, source_citation, is_primary_research
) VALUES
(
    'MIMIC-IV v3.1',
    'REAL_DEIDENTIFIED_EHR',
    'United States (Beth Israel Deaconess Medical Center)',
    '2008–2022',
    299712,
    523740,
    'REQUIRES_CREDENTIALED_DATA',
    'NOT_TRAINED',
    'PRIMARY_RESEARCH_SPECIFIED',
    'mimic-iv-v3.1-pipeline',
    NULL,
    'Requires PhysioNet credentialed access and signed Data Use Agreement (DUA). Raw data files are not bundled in repository. No synthetic data substituted.',
    'Johnson, A., Bulgarelli, L., Pollard, T., Horng, S., Celi, L. A., & Mark, R. (2023). MIMIC-IV (version 3.1). PhysioNet.',
    true
),
(
    'UCI Diabetes 130-US Hospitals (1999–2008)',
    'HISTORICAL_CLINICAL_COHORT',
    'United States (130 multi-center clinical facilities)',
    '1999–2008',
    71518,
    101766,
    'AVAILABLE',
    'TRAINED',
    'LEGACY_BASELINE_MODEL',
    'readmission-risk v1.0',
    '{"accuracy": 0.6898, "recall": 0.4725, "precision": 0.1734, "roc_auc": 0.6478, "f1_score": 0.2537, "total_records": 101766}',
    'Legacy comparative baseline. Historical inpatient diabetes encounters from 1999-2008. Not representative of modern longitudinal clinical care.',
    'Strack, B. et al. (2014). Impact of HbA1c Measurement on Hospital Readmission Rates. BioMed Research International.',
    false
),
(
    'EHRSHOT',
    'EXTERNAL_BENCHMARK',
    'United States (Stanford Medicine)',
    '2008–2022',
    6736,
    412000,
    'NOT_AVAILABLE',
    'NOT_TRAINED',
    'EXTERNAL_VALIDATION_BENCHMARK',
    'ehrshot-benchmark-v1',
    NULL,
    'Few-shot benchmark for clinical foundation models. Maintained as separate validation schema without merging.',
    'Wornow, M. et al. (2023). EHRSHOT: An EHR Benchmark for Few-Shot Evaluation of Foundation Models. NeurIPS 2023.',
    false
),
(
    'MC-MED',
    'EXTERNAL_BENCHMARK',
    'Multi-Center International Consortium',
    '2015–2023',
    84200,
    1150000,
    'NOT_AVAILABLE',
    'NOT_TRAINED',
    'EXTERNAL_VALIDATION_BENCHMARK',
    'mc-med-benchmark-v1',
    NULL,
    'Multi-center clinical benchmark evaluating cross-institutional generalization. Maintained as distinct benchmark registry.',
    'Multi-Center Medical Benchmark Consortium (2024). MC-MED Evaluation Protocol.',
    false
);

-- 8. Seed Governed Models into Model Registry
INSERT INTO model_registry (
    model_key, model_name, version, algorithm, dataset_name, target_name,
    prediction_horizon, features_json, metrics_json, feature_importances_json,
    limitations, status, trained_at
) VALUES
(
    'readmission-30d-uci-legacy',
    '30-Day Hospital Readmission Risk (Legacy Baseline)',
    'v1.0',
    'RandomForestClassifier (150 estimators, depth 10, balanced)',
    'UCI Diabetes 130-US Hospitals (1999–2008)',
    '30-Day Hospital Readmission (<30 days)',
    '30 Days',
    '["age","time_in_hospital","num_lab_procedures","num_procedures","num_medications","number_outpatient","number_emergency","number_inpatient","number_diagnoses","diabetes_med","insulin","a1c_tested"]',
    '{"accuracy": 0.6898, "recall": 0.4725, "precision": 0.1734, "roc_auc": 0.6478, "f1_score": 0.2537}',
    '{"number_inpatient": 0.3415, "num_lab_procedures": 0.1221, "num_medications": 0.1091, "time_in_hospital": 0.0901, "age": 0.0713, "number_diagnoses": 0.0664, "number_emergency": 0.0588, "num_procedures": 0.0499, "number_outpatient": 0.0393, "diabetes_med": 0.0176, "insulin": 0.0176, "a1c_tested": 0.0162}',
    'Legacy comparative model trained on 1999-2008 cohort. Advisory decision-support only. Not a medical diagnosis.',
    'TRAINED',
    '2026-09-19 05:38:53+00'
),
(
    'mimic-iv-mortality-48h',
    'In-Hospital 48-Hour Mortality Risk (MIMIC-IV Pipeline)',
    'v1.0-draft',
    'GradientBoostingClassifier / LogisticRegression',
    'MIMIC-IV v3.1',
    'In-Hospital Mortality within 48 Hours of ICU Admission',
    '48 Hours',
    '["anchor_age","admission_type","charlson_comorbidity_index","oasis_score","sofa_score","first_day_lactate","first_day_creatinine","first_day_bun","first_day_wbc","first_day_gcs"]',
    NULL,
    NULL,
    'Model pipeline specified for MIMIC-IV v3.1. Requires credentialed PhysioNet data files. Not marked trained until real data is supplied. Zero synthetic data substituted.',
    'PENDING_DATA',
    NULL
),
(
    'mimic-iv-readmission-30d',
    '30-Day Multi-Hospital Readmission Risk (MIMIC-IV Pipeline)',
    'v1.0-draft',
    'LightGBM / RandomForestClassifier',
    'MIMIC-IV v3.1',
    '30-Day All-Cause Unplanned Readmission',
    '30 Days',
    '["anchor_age","prior_admissions_365d","length_of_stay","emergency_admissions_count","drg_severity","num_icd_diagnoses","num_lab_abnormalities","high_risk_medication_count","discharge_location"]',
    NULL,
    NULL,
    'Model pipeline specified for MIMIC-IV v3.1. Awaiting credentialed distribution files. Strictly not trained without genuine data.',
    'PENDING_DATA',
    NULL
);

