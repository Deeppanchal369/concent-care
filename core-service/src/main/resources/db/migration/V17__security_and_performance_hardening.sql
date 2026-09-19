-- V17__security_and_performance_hardening.sql
-- OWASP ASVS 5.0.0 & Performance Hardening Migration
-- Adds justified composite indexes for high-frequency security evaluation,
-- audit queries, clinical timeline paging, and notification retrieval.

-- 1. Optimize audit log administrative paging & actor queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp_actor ON audit_logs(timestamp DESC, actor_username);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_result ON audit_logs(action, result);

-- 2. Optimize patient access-log activity timeline paging
CREATE INDEX IF NOT EXISTS idx_access_logs_patient_accessed ON access_logs(patient_id, accessed_at DESC);

-- 3. Optimize clinical observations retrieval (vitals timeline)
CREATE INDEX IF NOT EXISTS idx_observations_patient_observed ON observations(patient_id, observed_at DESC);

-- 4. Optimize prescriptions retrieval by patient
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_created ON prescriptions(patient_id, created_at DESC);

-- 5. Optimize notifications retrieval by user
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created ON notifications(recipient_user_id, created_at DESC);

-- 6. Optimize authorization & consent evaluation (OWASP ASVS V4.1 Access Control)
CREATE INDEX IF NOT EXISTS idx_consents_eval ON consents(patient_id, doctor_id, revoked, expires_at);

