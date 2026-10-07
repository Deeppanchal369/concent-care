-- V19__envers_provenance_columns.sql
-- Add audit table columns for Hibernate Envers on Prescription entity with provenance tracking

ALTER TABLE prescriptions_aud ADD COLUMN IF NOT EXISTS source_document_id BIGINT;
ALTER TABLE prescriptions_aud ADD COLUMN IF NOT EXISTS provenance_text VARCHAR(255);

