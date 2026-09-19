-- V7__prescriptions.sql
-- Prescriptions, items, nurse administration logs, and audit tables

CREATE TABLE prescriptions (
    id              BIGSERIAL PRIMARY KEY,
    patient_id      BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id       BIGINT NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    encounter_id    BIGINT REFERENCES encounters(id) ON DELETE SET NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'DISCONTINUED')),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE prescription_items (
    id                  BIGSERIAL PRIMARY KEY,
    prescription_id     BIGINT NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    medication_name     VARCHAR(255) NOT NULL,
    dosage              VARCHAR(100) NOT NULL,
    frequency           VARCHAR(100) NOT NULL,
    duration_days       INT NOT NULL DEFAULT 7,
    instructions        TEXT,
    start_date          DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date            DATE,
    active              BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE medication_administrations (
    id                      BIGSERIAL PRIMARY KEY,
    prescription_item_id    BIGINT NOT NULL REFERENCES prescription_items(id) ON DELETE CASCADE,
    nurse_id                BIGINT NOT NULL REFERENCES nurses(id) ON DELETE RESTRICT,
    administered_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    status                  VARCHAR(20) NOT NULL DEFAULT 'GIVEN' CHECK (status IN ('GIVEN', 'REFUSED', 'HELD')),
    notes                   TEXT
);

CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_doctor ON prescriptions(doctor_id);
CREATE INDEX idx_rx_items_prescription ON prescription_items(prescription_id);
CREATE INDEX idx_med_admin_item ON medication_administrations(prescription_item_id);

CREATE TABLE prescriptions_aud (
    id              BIGINT NOT NULL,
    rev             INTEGER NOT NULL REFERENCES revinfo(rev),
    revtype         SMALLINT,
    patient_id      BIGINT,
    doctor_id       BIGINT,
    encounter_id    BIGINT,
    status          VARCHAR(20),
    notes           TEXT,
    created_at      TIMESTAMPTZ,
    PRIMARY KEY (id, rev)
);

CREATE TABLE prescription_items_aud (
    id                  BIGINT NOT NULL,
    rev                 INTEGER NOT NULL REFERENCES revinfo(rev),
    revtype             SMALLINT,
    prescription_id     BIGINT,
    medication_name     VARCHAR(255),
    dosage              VARCHAR(100),
    frequency           VARCHAR(100),
    duration_days       INT,
    instructions        TEXT,
    start_date          DATE,
    end_date            DATE,
    active              BOOLEAN,
    PRIMARY KEY (id, rev)
);

