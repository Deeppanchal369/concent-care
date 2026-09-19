-- V13__ehr_architecture_and_pagination.sql
-- EHR Information Architecture: document lifecycle, archiving, clinical amendments, and pagination indexes

-- 1. Document lifecycle & metadata
ALTER TABLE documents ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255);
UPDATE documents SET title = file_name WHERE title IS NULL;
UPDATE documents SET original_filename = file_name WHERE original_filename IS NULL;

ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS archived_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_processing_status_check;
ALTER TABLE documents ADD CONSTRAINT documents_processing_status_check 
    CHECK (processing_status IN ('PENDING', 'UPLOADED', 'PROCESSING', 'READY', 'NEEDS_REVIEW', 'COMPLETED', 'FAILED'));

ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_ai_status_check;
ALTER TABLE documents ADD CONSTRAINT documents_ai_status_check 
    CHECK (ai_status IN ('PENDING', 'PROCESSING', 'READY', 'NEEDS_REVIEW', 'COMPLETED', 'FAILED'));

CREATE INDEX IF NOT EXISTS idx_documents_patient_paged ON documents (patient_id, is_archived, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title);

-- 2. Encounter amendments & archiving
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS is_amended BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS amendment_notes TEXT;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS amended_at TIMESTAMPTZ;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS amended_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_encounters_patient_date ON encounters(patient_id, encounter_date DESC);

-- 3. Diagnosis statuses, notes & archiving
ALTER TABLE diagnoses ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' 
    CHECK (status IN ('ACTIVE', 'RESOLVED', 'AMENDED', 'ARCHIVED'));
ALTER TABLE diagnoses ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE diagnoses ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_diagnoses_patient_date ON diagnoses(patient_id, diagnosed_date DESC);

-- 4. Clinical pagination indexes
CREATE INDEX IF NOT EXISTS idx_lab_reports_patient_date ON lab_reports(patient_id, reported_at DESC);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_date ON prescriptions(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_observations_patient_date ON observations(patient_id, observed_at DESC);

