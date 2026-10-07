-- V21__notification_consent_types.sql
-- Expand notifications_type_check to support explicit consent lifecycle event types

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'ACCESS_REQUEST', 'ACCESS_APPROVED', 'ACCESS_REVOKED',
    'NEW_REPORT', 'NEW_PRESCRIPTION', 'DOCTOR_INSTRUCTION',
    'NURSE_ASSIGNMENT', 'TASK_COMPLETED', 'AI_PROCESSING_FINISHED',
    'RISK_ASSESSMENT',
    'CONSENT_GRANTED', 'CONSENT_EXPIRING', 'CONSENT_EXPIRED', 'CONSENT_REVOKED'
));

