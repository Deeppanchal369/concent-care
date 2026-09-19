-- V2__audit_and_envers.sql
-- Hibernate Envers configuration and system-wide clinical audit log

CREATE SEQUENCE IF NOT EXISTS revinfo_seq START WITH 1 INCREMENT BY 50;

CREATE TABLE revinfo (
    rev         SERIAL PRIMARY KEY,
    revtstmp    BIGINT
);

CREATE TABLE patients_aud (
    id                      BIGINT NOT NULL,
    rev                     INTEGER NOT NULL REFERENCES revinfo(rev),
    revtype                 SMALLINT,
    linked_user_id          BIGINT,
    full_name               VARCHAR(150),
    date_of_birth           DATE,
    gender                  VARCHAR(20),
    phone                   VARCHAR(30),
    email                   VARCHAR(150),
    address                 TEXT,
    emergency_contact       VARCHAR(150),
    blood_group             VARCHAR(10),
    allergies               TEXT,
    chronic_conditions      TEXT,
    medical_history_summary TEXT,
    created_at              TIMESTAMPTZ,
    PRIMARY KEY (id, rev)
);

CREATE TABLE audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    actor_username  VARCHAR(100) NOT NULL,
    actor_role      VARCHAR(20) NOT NULL,
    action          VARCHAR(100) NOT NULL,
    resource_type   VARCHAR(100) NOT NULL,
    resource_id     VARCHAR(100),
    result          VARCHAR(20) NOT NULL,
    metadata_json   TEXT,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_username);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

