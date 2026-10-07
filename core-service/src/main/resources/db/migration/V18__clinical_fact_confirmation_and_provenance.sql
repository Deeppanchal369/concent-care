-- V18__clinical_fact_confirmation_and_provenance.sql
-- Safe Clinical Data Normalization & EHR Fact Bridge
-- Tracks candidate clinical facts extracted from documents, human review decisions,
-- deduplication metadata, and canonical entity provenance.

-- 1. Create table for staged candidate clinical facts
CREATE TABLE IF NOT EXISTS document_extracted_facts (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    patient_id BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    fact_type VARCHAR(50) NOT NULL, -- ENCOUNTER, DIAGNOSIS, MEDICATION, LAB_REPORT, OBSERVATION
    field_name VARCHAR(150),
    extracted_data_json TEXT NOT NULL,
    confirmed_data_json TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING, CONFIRMED, EDITED, REJECTED
    confidence_level VARCHAR(30) NOT NULL DEFAULT 'STANDARD', -- STANDARD, NEEDS_REVIEW, LOW_CONFIDENCE
    canonical_entity_type VARCHAR(50), -- Encounter, Diagnosis, Prescription, LabReport
    canonical_entity_id BIGINT,
    reviewed_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by document and review status
CREATE INDEX IF NOT EXISTS idx_extracted_facts_doc_status ON document_extracted_facts(document_id, status);
CREATE INDEX IF NOT EXISTS idx_extracted_facts_patient_status ON document_extracted_facts(patient_id, status);

-- 2. Add provenance tracking columns to canonical EHR entities
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS source_document_id BIGINT REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS provenance_text VARCHAR(255);
ALTER TABLE encounters ALTER COLUMN doctor_id DROP NOT NULL;

ALTER TABLE diagnoses ADD COLUMN IF NOT EXISTS source_document_id BIGINT REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE diagnoses ADD COLUMN IF NOT EXISTS provenance_text VARCHAR(255);
ALTER TABLE diagnoses ALTER COLUMN doctor_id DROP NOT NULL;

ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS source_document_id BIGINT REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS provenance_text VARCHAR(255);
ALTER TABLE prescriptions ALTER COLUMN doctor_id DROP NOT NULL;

ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS provenance_text VARCHAR(255);
-- Note: lab_reports already contains document_id column referencing documents(id)

