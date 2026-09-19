-- V9__notifications.sql
-- Real notification records for patients, doctors, nurses, and admins

CREATE TABLE notifications (
    id                  BIGSERIAL PRIMARY KEY,
    recipient_user_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type                VARCHAR(50) NOT NULL CHECK (type IN (
                            'ACCESS_REQUEST', 'ACCESS_APPROVED', 'ACCESS_REVOKED',
                            'NEW_REPORT', 'NEW_PRESCRIPTION', 'DOCTOR_INSTRUCTION',
                            'NURSE_ASSIGNMENT', 'TASK_COMPLETED', 'AI_PROCESSING_FINISHED',
                            'RISK_ASSESSMENT'
                        )),
    title               VARCHAR(200) NOT NULL,
    message             TEXT NOT NULL,
    reference_type      VARCHAR(50),
    reference_id        VARCHAR(50),
    read_status         BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_user_id);
CREATE INDEX idx_notifications_unread ON notifications(recipient_user_id, read_status);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

