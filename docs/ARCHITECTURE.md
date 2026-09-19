# ConsentCare Architecture Specification

## 1. Executive Summary

ConsentCare is a production-grade, patient-governed Electronic Health Record (EHR) platform engineered with a strict zero-trust consent enforcement architecture. Unlike legacy EHRs where all clinicians have indiscriminate access to all records, ConsentCare ensures that clinical data access is dynamically evaluated against explicit, fine-grained patient consent policies.

---

## 2. System Topology & Microservice Responsibilities

```
                         +-----------------------------------+
                         |         React 19 Frontend         |
                         |   (Vite, Tailwind CSS, SSE Alerts)|
                         +-----------------+-----------------+
                                           |
                              HTTP / REST & SSE Stream
                                           |
                                           v
                         +-----------------------------------+
                         |      Spring Boot Core Service     |
                         |     Port: 8080 (JVM 17 / 21)      |
                         |  - Spring Security & JWT Auth     |
                         |  - Dynamic Consent Security Engine|
                         |  - Clinical Data & EHR Feature Svc|
                         |  - HL7 FHIR R4 JSON Projections   |
                         |  - Real-time SSE Dispatcher       |
                         +--------+---------+---------+------+
                                  |         |         |
               SQL Queries / Views|         |HTTP     |HTTP
                                  v         |         |
      +-----------------------------+       |         |
      |     PostgreSQL 16 Engine    |       |         |
      |   - Flyway Migrations V1-V12|       |         |
      |   - Hibernate Envers Audit  |       |         |
      |   - FHIR Interop Views      |       |         |
      +-----------------------------+       |         |
                                            v         v
                +-----------------------------+     +-----------------------------+
                |     ML Clinical Risk Svc    |     |    Agentic Document Svc     |
                |        (Port: 8001)         |     |        (Port: 8002)         |
                |  - UCI Diabetes Readmission |     |  - Clinical Entity Extraction|
                |  - RandomForest v1.0 Model  |     |  - Lab & Pathology Parsing  |
                |  - Precision/Recall Metrics |     |  - AI Summarization & Safety|
                +-----------------------------+     +-----------------------------+
```

### Microservice Roles

1. **Frontend (React 19 / Vite / Tailwind CSS v4)**:
   - Modern healthcare SaaS interface with role-based clinical workstations (Doctor Station, Nurse Care Station, Patient Self-Governance Portal, Hospital Admin Console).
   - Real-time SSE subscription to `/api/notifications/stream?token=...` with automatic reconnect and toast alerts.
   - 1-Click ML Readmission Risk evaluation (no manual typing of feature parameters).
   - HL7 FHIR R4 live JSON viewer.

2. **Core Service (Spring Boot 3.3 / Java 17/21)**:
   - Single point of entry for client web requests.
   - Comprehensive domain entities: Patients, Doctors, Nurses, Departments, Consents, Access Requests, Encounters, Diagnoses, Prescriptions, Lab Orders & Reports, Observations/Vitals, and Audit Logs.
   - `ConsentSecurityEvaluator`: Spring Security SpEL evaluator (`@PreAuthorize("@consentSecurityEvaluator.canAccessPatientAny(...)")`) verifying active unrevoked unexpired patient consents.
   - `EhrFeatureService`: Computes real features from patient chart (encounters, visit cadence, medication count, chronic flags) and sends them to `risk-service`.
   - `NotificationSseService`: Maintains active `SseEmitter` clients with keep-alive heartbeats and instant event broadcasting.

3. **Risk Service (FastAPI / Scikit-Learn / Pandas)**:
   - Serves versioned machine learning readmission prediction (`model_v1.0.joblib`).
   - Trained on reproducible benchmark distributions inspired by the UCI Diabetes 130-US Hospitals study (Accuracy: 86.9%, Precision: 94.6%, Recall: 88.1%, ROC-AUC: 94.3%).
   - Returns probability scores, risk classification (`LOW`, `MODERATE`, `HIGH`), and top contributing factor weights.

4. **Agent Service (FastAPI / Regex & NLP / LLM Client)**:
   - Processes unstructured and structured clinical documents (PDF, CSV, text, pathology).
   - Extracts quantifiable lab findings (blood glucose, HbA1c, hemoglobin, creatinine, lipids), medications, conditions, and abnormalities.
   - Generates clinician summaries stamped with the mandatory regulatory disclaimer: `"AI-assisted — verify against original document."`

5. **PostgreSQL 16**:
   - Primary relational database managed by strictly sequential Flyway migrations (`V1` to `V12`).
   - Hibernate Envers audit revisions (`revinfo` with `revinfo_seq INCREMENT BY 50`).
   - HL7 FHIR R4 SQL projections (`fhir_patient_views`, `fhir_observation_views`, `fhir_condition_views`, `fhir_medication_request_views`).

---

## 3. Dynamic Consent Evaluation Model

Access control in ConsentCare operates on a three-tier authorization stack:
1. **System RBAC**: Admin, Doctor, Nurse, Patient roles.
2. **Clinical Relationship Verification**:
   - Patients own their personal records.
   - Attending doctors must possess active, unrevoked, unexpired consent granted by the patient either directly or via an approved `AccessRequest`.
   - Nurses must belong to an active care team (`doctor_nurse_assignments`) whose attending physician has active consent for the patient.
   - System Administrators can inspect system audit metadata and user provisioning, but cannot override medical consent to access clinical charts.
3. **Granular Category Scoping**:
   Consent can be scoped to specific categories (`CLINICAL_NOTES`, `DIAGNOSES`, `MEDICATIONS`, `LAB_REPORTS`, `VITALS`, `ENTIRE_RECORD`).

---

## 4. HL7 FHIR R4 Interoperability

ConsentCare exposes standard HL7 FHIR R4 resources via native SQL views:
- `GET /api/fhir/Patient/{id}` -> FHIR `Patient` resource
- `GET /api/fhir/Patient/{id}/$everything` -> Complete FHIR `Bundle` (searchset) aggregating Patient, Observations (vitals), Conditions (diagnoses), and MedicationRequests (prescriptions)
- `GET /api/fhir/Observation?patient={id}` -> FHIR `Observation` resources
- `GET /api/fhir/Condition?patient={id}` -> FHIR `Condition` resources
- `GET /api/fhir/MedicationRequest?patient={id}` -> FHIR `MedicationRequest` resources

