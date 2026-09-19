-- V5__documents.sql
-- Patient document storage, AI processing status, and doctor sharing

CREATE TABLE documents (
    id                  BIGSERIAL PRIMARY KEY,
    patient_id          BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    uploaded_by         BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    file_name           VARCHAR(255) NOT NULL,
    content_type        VARCHAR(100),
    file_size           BIGINT NOT NULL,
    storage_path        VARCHAR(500) NOT NULL,
    category            VARCHAR(50) NOT NULL CHECK (category IN (
                            'LABORATORY_REPORT', 'PRESCRIPTION', 'IMAGING_REPORT',
                            'DISCHARGE_SUMMARY', 'MEDICAL_CERTIFICATE', 'PREVIOUS_CONSULTATION',
                            'DIAGNOSIS_REPORT', 'OTHER'
                        )),
    description         VARCHAR(255),
    processing_status   VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (processing_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    ai_status           VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (ai_status IN ('PENDING', 'COMPLETED', 'FAILED')),
    extracted_text      TEXT,
    uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE document_shares (
    id              BIGSERIAL PRIMARY KEY,
    document_id     BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    doctor_id       BIGINT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    shared_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_doc_doctor UNIQUE (document_id, doctor_id)
);

CREATE INDEX idx_documents_patient ON documents(patient_id);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_doc_shares_doctor ON document_shares(doctor_id);

