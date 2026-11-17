-- V24__nurse_task_types_and_priorities.sql
-- Expand nurse task types and priorities to support UI representations and clinical aliases

ALTER TABLE nurse_tasks DROP CONSTRAINT IF EXISTS nurse_tasks_task_type_check;
ALTER TABLE nurse_tasks ADD CONSTRAINT nurse_tasks_task_type_check CHECK (task_type IN (
    'MEDICATION_ADMINISTRATION', 'MEDICATION_ADMIN',
    'VITAL_CHECK', 'VITALS_CHECK',
    'LAB_SAMPLE_COLLECTION', 'SAMPLE_COLLECTION',
    'WOUND_CARE', 'WOUND_DRESSING',
    'PATIENT_EDUCATION',
    'GENERAL_OBSERVATION', 'OBSERVATION'
));

ALTER TABLE nurse_tasks DROP CONSTRAINT IF EXISTS nurse_tasks_priority_check;
ALTER TABLE nurse_tasks ADD CONSTRAINT nurse_tasks_priority_check CHECK (priority IN (
    'ROUTINE', 'URGENT', 'EMERGENCY', 'STAT'
));
