-- V15__ai_real_ml_and_document_understanding.sql
-- Real AI Document Understanding, OCR tracking, and Supervised ML Risk Prediction versioning

-- 1. Enhance ai_document_analyses table with model metadata, status, and structured result payload
ALTER TABLE ai_document_analyses
    ADD COLUMN IF NOT EXISTS model_provider VARCHAR(100) DEFAULT 'local-nlp',
    ADD COLUMN IF NOT EXISTS model_version VARCHAR(50) DEFAULT '1.0.0',
    ADD COLUMN IF NOT EXISTS prompt_version VARCHAR(50) DEFAULT '1.0.0',
    ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'READY',
    ADD COLUMN IF NOT EXISTS processing_duration_ms BIGINT,
    ADD COLUMN IF NOT EXISTS structured_result_json TEXT;

-- 2. Enhance risk_predictions table with data completeness, execution status, and clinical notes
ALTER TABLE risk_predictions
    ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
    ADD COLUMN IF NOT EXISTS data_completeness VARCHAR(50) DEFAULT 'COMPLETE',
    ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Add composite indexes for high-performance retrieval
CREATE INDEX IF NOT EXISTS idx_ai_doc_analyses_status ON ai_document_analyses(document_id, status);
CREATE INDEX IF NOT EXISTS idx_risk_predictions_doctor ON risk_predictions(requested_by_doctor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_predictions_completeness ON risk_predictions(patient_id, data_completeness);

