-- V16__allow_null_risk_score_and_insufficient_data.sql
-- Allow nullable risk_score and INSUFFICIENT_DATA risk_level when patient data is incomplete (zero-fabrication mandate)

ALTER TABLE risk_predictions ALTER COLUMN risk_score DROP NOT NULL;
ALTER TABLE risk_predictions DROP CONSTRAINT IF EXISTS risk_predictions_risk_level_check;
ALTER TABLE risk_predictions ADD CONSTRAINT risk_predictions_risk_level_check
    CHECK (risk_level IN ('LOW', 'MODERATE', 'HIGH', 'INSUFFICIENT_DATA'));
ALTER TABLE risk_predictions ALTER COLUMN contributing_factors_json DROP NOT NULL;
ALTER TABLE risk_predictions ALTER COLUMN features_used_json DROP NOT NULL;

