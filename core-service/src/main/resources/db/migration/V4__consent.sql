-- V4__consent.sql
-- Granular patient-controlled consent and audit history

CREATE TABLE consents (
    id                  BIGSERIAL PRIMARY KEY,
    patient_id          BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id           BIGINT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    access_request_id   BIGINT REFERENCES access_requests(id) ON DELETE SET NULL,
    category            VARCHAR(50) NOT NULL,
    purpose             VARCHAR(255) NOT NULL,
    granted_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at          TIMESTAMPTZ NOT NULL,
    revoked             BOOLEAN NOT NULL DEFAULT false,
    revoked_at          TIMESTAMPTZ,
    status              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'REVOKED'))
);

CREATE INDEX idx_consent_patient ON consents(patient_id);
CREATE INDEX idx_consent_doctor ON consents(doctor_id);
CREATE INDEX idx_consent_patient_doc_cat ON consents(patient_id, doctor_id, category);
CREATE INDEX idx_consent_status ON consents(status);

CREATE TABLE consents_aud (
    id                  BIGINT NOT NULL,
    rev                 INTEGER NOT NULL REFERENCES revinfo(rev),
    revtype             SMALLINT,
    patient_id          BIGINT,
    doctor_id           BIGINT,
    access_request_id   BIGINT,
    category            VARCHAR(50),
    purpose             VARCHAR(255),
    granted_at          TIMESTAMPTZ,
    expires_at          TIMESTAMPTZ,
    revoked             BOOLEAN,
    revoked_at          TIMESTAMPTZ,
    status              VARCHAR(20),
    PRIMARY KEY (id, rev)
);

