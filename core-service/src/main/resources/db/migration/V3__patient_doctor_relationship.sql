-- V3__patient_doctor_relationship.sql
-- Doctor-Nurse care team assignments, Doctor-Patient relationships, and Access Requests

CREATE TABLE doctor_nurse_assignments (
    id              BIGSERIAL PRIMARY KEY,
    doctor_id       BIGINT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    nurse_id        BIGINT NOT NULL REFERENCES nurses(id) ON DELETE CASCADE,
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    active          BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT uq_doctor_nurse UNIQUE (doctor_id, nurse_id)
);

CREATE TABLE patient_doctor_relationships (
    id              BIGSERIAL PRIMARY KEY,
    patient_id      BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id       BIGINT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_patient_doctor UNIQUE (patient_id, doctor_id)
);

CREATE TABLE access_requests (
    id                      BIGSERIAL PRIMARY KEY,
    patient_id              BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id               BIGINT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    requested_by            VARCHAR(20) NOT NULL CHECK (requested_by IN ('PATIENT', 'DOCTOR')),
    status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED', 'EXPIRED')),
    requested_categories    TEXT NOT NULL,
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at            TIMESTAMPTZ
);

CREATE INDEX idx_dna_doctor ON doctor_nurse_assignments(doctor_id);
CREATE INDEX idx_dna_nurse ON doctor_nurse_assignments(nurse_id);
CREATE INDEX idx_pdr_patient ON patient_doctor_relationships(patient_id);
CREATE INDEX idx_pdr_doctor ON patient_doctor_relationships(doctor_id);
CREATE INDEX idx_ar_patient ON access_requests(patient_id);
CREATE INDEX idx_ar_doctor ON access_requests(doctor_id);
CREATE INDEX idx_ar_status ON access_requests(status);

