-- V14__nurse_workflow_and_access_requests.sql
-- Phase 4: Enhancements for Nurse Concurrency, Task Execution Lifecycle, and Access Requests

-- 1. Nurse optimistic locking version
ALTER TABLE nurses ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

-- 2. Nurse task lifecycle timestamps and notes
ALTER TABLE nurse_tasks ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE nurse_tasks ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE nurse_tasks ADD COLUMN IF NOT EXISTS completion_notes TEXT;
ALTER TABLE nurse_tasks ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE nurse_tasks ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 3. Access request duration and reviewer tracking
ALTER TABLE access_requests ADD COLUMN IF NOT EXISTS duration_days INT DEFAULT 30;
ALTER TABLE access_requests ADD COLUMN IF NOT EXISTS reviewed_by BIGINT REFERENCES users(id);

-- 4. Fast lookup indexes for concurrency, active consents, and task queues
CREATE INDEX IF NOT EXISTS idx_nurse_tasks_nurse_status ON nurse_tasks(nurse_id, status);
CREATE INDEX IF NOT EXISTS idx_consents_patient_doctor_active ON consents(patient_id, doctor_id, revoked, expires_at);
CREATE INDEX IF NOT EXISTS idx_access_requests_doctor_status ON access_requests(doctor_id, status);
CREATE INDEX IF NOT EXISTS idx_access_requests_patient_status ON access_requests(patient_id, status);

