-- V10__ai.sql
-- AI Document analyses, ML risk predictions, and model version metadata

CREATE TABLE ai_document_analyses (
    id                  BIGSERIAL PRIMARY KEY,
    document_id         BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    patient_id          BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    report_type         VARCHAR(100),
    summary_text        TEXT NOT NULL,
    entities_json       TEXT NOT NULL,
    confidence_score    NUMERIC(5,4),
    disclaimer          VARCHAR(255) NOT NULL DEFAULT 'AI-assisted — verify against original document.',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE risk_predictions (
    id                      BIGSERIAL PRIMARY KEY,
    patient_id              BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    requested_by_doctor_id  BIGINT REFERENCES doctors(id) ON DELETE SET NULL,
    model_version           VARCHAR(50) NOT NULL,
    risk_score              NUMERIC(5,4) NOT NULL,
    risk_level              VARCHAR(20) NOT NULL CHECK (risk_level IN ('LOW', 'MODERATE', 'HIGH')),
    contributing_factors_json TEXT NOT NULL,
    features_used_json      TEXT NOT NULL,
    clinical_disclaimer     VARCHAR(255) NOT NULL DEFAULT 'Decision-support only. This prediction is not a medical diagnosis.',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE model_versions (
    id              BIGSERIAL PRIMARY KEY,
    model_name      VARCHAR(100) NOT NULL,
    version         VARCHAR(50) NOT NULL UNIQUE,
    algorithm       VARCHAR(100) NOT NULL,
    dataset_name    VARCHAR(150) NOT NULL,
    metrics_json    TEXT NOT NULL,
    trained_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    active          BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_ai_doc_analyses_doc ON ai_document_analyses(document_id);
CREATE INDEX idx_ai_doc_analyses_pat ON ai_document_analyses(patient_id);
CREATE INDEX idx_risk_predictions_pat ON risk_predictions(patient_id);
CREATE INDEX idx_model_versions_active ON model_versions(active);

