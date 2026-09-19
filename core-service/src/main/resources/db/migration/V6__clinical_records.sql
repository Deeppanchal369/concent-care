-- V6__clinical_records.sql
-- Encounters, Diagnoses, Lab Requests, Lab Reports, and Vital Observations

CREATE TABLE encounters (
    id              BIGSERIAL PRIMARY KEY,
    patient_id      BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id       BIGINT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    encounter_type  VARCHAR(50) NOT NULL,
    chief_complaint TEXT,
    clinical_notes  TEXT,
    assessment_plan TEXT,
    encounter_date  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE diagnoses (
    id              BIGSERIAL PRIMARY KEY,
    patient_id      BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id       BIGINT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    encounter_id    BIGINT REFERENCES encounters(id) ON DELETE SET NULL,
    code            VARCHAR(50),
    description     VARCHAR(255) NOT NULL,
    severity        VARCHAR(20) CHECK (severity IN ('MILD', 'MODERATE', 'SEVERE')),
    diagnosed_date  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lab_requests (
    id              BIGSERIAL PRIMARY KEY,
    patient_id      BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id       BIGINT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    test_name       VARCHAR(150) NOT NULL,
    category        VARCHAR(100),
    urgency         VARCHAR(20) NOT NULL DEFAULT 'ROUTINE' CHECK (urgency IN ('ROUTINE', 'URGENT', 'STAT')),
    status          VARCHAR(20) NOT NULL DEFAULT 'ORDERED' CHECK (status IN ('ORDERED', 'SAMPLE_COLLECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    instructions    TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lab_reports (
    id              BIGSERIAL PRIMARY KEY,
    lab_request_id  BIGINT REFERENCES lab_requests(id) ON DELETE SET NULL,
    patient_id      BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    document_id     BIGINT REFERENCES documents(id) ON DELETE SET NULL,
    test_name       VARCHAR(150) NOT NULL,
    result_value    VARCHAR(100) NOT NULL,
    unit            VARCHAR(50),
    reference_range VARCHAR(100),
    flag            VARCHAR(20) NOT NULL DEFAULT 'NORMAL' CHECK (flag IN ('NORMAL', 'HIGH', 'LOW', 'CRITICAL', 'ABNORMAL')),
    reported_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE observations (
    id              BIGSERIAL PRIMARY KEY,
    patient_id      BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    nurse_id        BIGINT REFERENCES nurses(id) ON DELETE SET NULL,
    doctor_id       BIGINT REFERENCES doctors(id) ON DELETE SET NULL,
    vital_type      VARCHAR(50) NOT NULL CHECK (vital_type IN ('BLOOD_PRESSURE', 'HEART_RATE', 'RESPIRATORY_RATE', 'TEMPERATURE', 'O2_SATURATION', 'BLOOD_GLUCOSE', 'BMI', 'WEIGHT', 'HEIGHT')),
    value_numeric   NUMERIC(8,2) NOT NULL,
    value_text      VARCHAR(100),
    unit            VARCHAR(30) NOT NULL,
    notes           TEXT,
    observed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_encounters_patient ON encounters(patient_id);
CREATE INDEX idx_diagnoses_patient ON diagnoses(patient_id);
CREATE INDEX idx_lab_requests_patient ON lab_requests(patient_id);
CREATE INDEX idx_lab_reports_patient ON lab_reports(patient_id);
CREATE INDEX idx_observations_patient ON observations(patient_id);

