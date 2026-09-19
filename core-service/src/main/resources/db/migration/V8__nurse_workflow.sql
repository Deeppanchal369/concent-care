-- V8__nurse_workflow.sql
-- Nurse task management, event timeline, and state transitions

CREATE TABLE nurse_tasks (
    id              BIGSERIAL PRIMARY KEY,
    doctor_id       BIGINT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    nurse_id        BIGINT NOT NULL REFERENCES nurses(id) ON DELETE CASCADE,
    patient_id      BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    task_type       VARCHAR(50) NOT NULL CHECK (task_type IN (
                        'MEDICATION_ADMINISTRATION', 'VITAL_CHECK', 'LAB_SAMPLE_COLLECTION',
                        'WOUND_CARE', 'PATIENT_EDUCATION', 'GENERAL_OBSERVATION'
                    )),
    priority        VARCHAR(20) NOT NULL DEFAULT 'ROUTINE' CHECK (priority IN ('ROUTINE', 'URGENT', 'EMERGENCY')),
    instructions    TEXT NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    due_time        TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE nurse_task_events (
    id              BIGSERIAL PRIMARY KEY,
    task_id         BIGINT NOT NULL REFERENCES nurse_tasks(id) ON DELETE CASCADE,
    actor_nurse_id  BIGINT NOT NULL REFERENCES nurses(id) ON DELETE CASCADE,
    event_type      VARCHAR(30) NOT NULL CHECK (event_type IN ('ASSIGNED', 'ACCEPTED', 'STARTED', 'NOTE_ADDED', 'COMPLETED', 'CANCELLED')),
    notes           TEXT,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nurse_tasks_nurse ON nurse_tasks(nurse_id);
CREATE INDEX idx_nurse_tasks_doctor ON nurse_tasks(doctor_id);
CREATE INDEX idx_nurse_tasks_patient ON nurse_tasks(patient_id);
CREATE INDEX idx_nurse_tasks_status ON nurse_tasks(status);
CREATE INDEX idx_task_events_task ON nurse_task_events(task_id);

