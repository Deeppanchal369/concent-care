-- V12__fhir.sql
-- HL7 FHIR R4 JSON projections for standardized healthcare interoperability

CREATE OR REPLACE VIEW fhir_patient_views AS
SELECT
    p.id AS patient_id,
    json_build_object(
        'resourceType', 'Patient',
        'id', p.id::text,
        'identifier', json_build_array(
            json_build_object('system', 'http://consentcare.local/patients', 'value', p.id::text)
        ),
        'name', json_build_array(
            json_build_object('use', 'official', 'text', p.full_name)
        ),
        'telecom', json_build_array(
            json_build_object('system', 'phone', 'value', COALESCE(p.phone, '')),
            json_build_object('system', 'email', 'value', COALESCE(p.email, ''))
        ),
        'gender', LOWER(COALESCE(p.gender, 'unknown')),
        'birthDate', p.date_of_birth::text,
        'address', json_build_array(
            json_build_object('text', COALESCE(p.address, ''))
        )
    ) AS fhir_resource
FROM patients p;

CREATE OR REPLACE VIEW fhir_practitioner_views AS
SELECT
    u.id AS user_id,
    d.id AS doctor_id,
    json_build_object(
        'resourceType', 'Practitioner',
        'id', u.id::text,
        'identifier', json_build_array(
            json_build_object('system', 'http://consentcare.local/practitioners', 'value', d.license_number)
        ),
        'name', json_build_array(
            json_build_object('text', u.full_name, 'prefix', json_build_array('Dr.'))
        ),
        'qualification', json_build_array(
            json_build_object('code', json_build_object('text', d.specialization))
        )
    ) AS fhir_resource
FROM doctors d
JOIN users u ON d.user_id = u.id;

CREATE OR REPLACE VIEW fhir_observation_views AS
SELECT
    o.id AS observation_id,
    o.patient_id,
    json_build_object(
        'resourceType', 'Observation',
        'id', o.id::text,
        'status', 'final',
        'code', json_build_object('text', o.vital_type),
        'subject', json_build_object('reference', 'Patient/' || o.patient_id::text),
        'effectiveDateTime', o.observed_at::text,
        'valueQuantity', json_build_object(
            'value', o.value_numeric,
            'unit', o.unit,
            'system', 'http://unitsofmeasure.org'
        ),
        'note', json_build_array(json_build_object('text', COALESCE(o.notes, '')))
    ) AS fhir_resource
FROM observations o;

CREATE OR REPLACE VIEW fhir_condition_views AS
SELECT
    d.id AS diagnosis_id,
    d.patient_id,
    json_build_object(
        'resourceType', 'Condition',
        'id', d.id::text,
        'clinicalStatus', json_build_object(
            'coding', json_build_array(json_build_object('code', 'active'))
        ),
        'code', json_build_object(
            'coding', json_build_array(json_build_object('code', COALESCE(d.code, 'UNK'), 'display', d.description))
        ),
        'subject', json_build_object('reference', 'Patient/' || d.patient_id::text),
        'recordedDate', d.diagnosed_date::text
    ) AS fhir_resource
FROM diagnoses d;

CREATE OR REPLACE VIEW fhir_medication_request_views AS
SELECT
    pi.id AS prescription_item_id,
    p.patient_id,
    json_build_object(
        'resourceType', 'MedicationRequest',
        'id', pi.id::text,
        'status', CASE WHEN pi.active THEN 'active' ELSE 'stopped' END,
        'intent', 'order',
        'medicationCodeableConcept', json_build_object('text', pi.medication_name),
        'subject', json_build_object('reference', 'Patient/' || p.patient_id::text),
        'requester', json_build_object('reference', 'Practitioner/' || p.doctor_id::text),
        'dosageInstruction', json_build_array(
            json_build_object('text', pi.dosage || ', ' || pi.frequency || '. ' || COALESCE(pi.instructions, ''))
        )
    ) AS fhir_resource
FROM prescription_items pi
JOIN prescriptions p ON pi.prescription_id = p.id;

