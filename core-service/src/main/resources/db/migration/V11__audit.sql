-- V11__audit.sql
-- Granular read-access audit logging with actor attribution

CREATE TABLE access_logs (
    id              BIGSERIAL PRIMARY KEY,
    patient_id      BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    actor_username  VARCHAR(100) NOT NULL,
    actor_role      VARCHAR(20) NOT NULL,
    category        VARCHAR(50) NOT NULL,
    decision        VARCHAR(10) NOT NULL CHECK (decision IN ('ALLOW', 'DENY')),
    reason          TEXT,
    flagged         BOOLEAN NOT NULL DEFAULT false,
    accessed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_access_logs_patient ON access_logs(patient_id);
CREATE INDEX idx_access_logs_actor ON access_logs(actor_username);
CREATE INDEX idx_access_logs_accessed_at ON access_logs(accessed_at DESC);

