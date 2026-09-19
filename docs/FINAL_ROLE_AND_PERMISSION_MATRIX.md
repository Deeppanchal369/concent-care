# ConsentCare EHR — Final Role and Permission Matrix

> **Classification**: Role-Based & Attribute-Based Authorization Matrix  
> **Security Model**: Zero-Trust Principle of Least Privilege  
> **Baseline Version**: v1.0-research-demo  
> **Cross-Reference**: [Comprehensive Role Matrix](docs/FINAL_ROLE_MATRIX.md) | [API Security Matrix](docs/API_SECURITY_MATRIX.md)

---

## 1. High-Level Role Definitions

| Role Identifier | Human-Readable Role | Primary Responsibilities | Strict Security Boundary |
|---|---|---|---|
| `ROLE_ADMIN` | **System Administrator** | User account provisioning, clinician onboarding, care-team assignments, system health inspection, immutable audit log review. | **Zero Clinical Visibility**: Strictly forbidden from accessing clinical charts, medical notes, lab results, prescriptions, vitals, or medical documents. |
| `ROLE_DOCTOR` | **Attending / Specialist Physician** | Clinical consultations, diagnoses, prescription authoring, lab test orders, Document AI review, supervised ML readmission prediction, nurse task delegation. | **Consent Sovereignty**: Strictly blocked from accessing any patient record or intervention without active, patient-granted consent for that specific clinical category. |
| `ROLE_NURSE` | **Care Team Nurse** | Bedside clinical care, vital signs recording, task execution, medication administration verification (MAR), and nurse availability management. | **Care-Team Bounded**: May only interact with patients under active care teams to which the nurse is formally assigned, and where physician holds active consent. |
| `ROLE_PATIENT` | **Patient / Record Owner** | Full ownership of personal health record, granting and revoking consent categories, approving access requests, uploading personal health records, viewing audit logs. | **Strict Self-Isolation**: Can only access own records, documents, and notifications. Zero visibility into other patients' charts or staff internal workflows. |

---

## 2. Granular Functional Matrix

### 2.1 Identity, Navigation & Workstations

| Workstation / UI Area | `ADMIN` | `DOCTOR` | `NURSE` | `PATIENT` | Enforcement Mechanism |
|---|---|---|---|---|---|
| **System Admin Console (`/admin`)** | **ALLOWED** | BLOCKED (403) | BLOCKED (403) | BLOCKED (403) | Route guard + `@PreAuthorize("hasRole('ADMIN')")` |
| **Doctor Workstation (`/doctor`)** | BLOCKED (403) | **ALLOWED** | BLOCKED (403) | BLOCKED (403) | Route guard + `@PreAuthorize("hasRole('DOCTOR')")` |
| **Nurse Workstation (`/nurse`)** | BLOCKED (403) | BLOCKED (403) | **ALLOWED** | BLOCKED (403) | Route guard + `@PreAuthorize("hasRole('NURSE')")` |
| **Patient Portal (`/patient`)** | BLOCKED (403) | BLOCKED (403) | BLOCKED (403) | **ALLOWED** | Route guard + `@PreAuthorize("hasRole('PATIENT')")` |
| **User Profile Self-View (`/me`)** | **ALLOWED** | **ALLOWED** | **ALLOWED** | **ALLOWED** | Stateless JWT claims resolution |

### 2.2 Clinical Records & Patient Demographics

| Operation / Endpoint | `ADMIN` | `DOCTOR` | `NURSE` | `PATIENT` | Enforcement Mechanism |
|---|---|---|---|---|---|
| Search / List All Patients | **ALLOWED** | BLOCKED (403) | BLOCKED (403) | BLOCKED (403) | Admin directory lookup only |
| List Consented Cohort | BLOCKED (403) | **CONSENTED ONLY** | BLOCKED (403) | BLOCKED (403) | `/api/doctors/my/patients` |
| View Full Patient Demographics | BLOCKED (403) | **CONSENTED ONLY** | CARE TEAM ONLY | **OWN ONLY** | `ConsentSecurityEvaluator` (`MEDICAL_HISTORY`) |
| View Longitudinal Encounters | BLOCKED (403) | **CONSENTED ONLY** | BLOCKED (403) | **OWN ONLY** | Category: `CLINICAL_NOTES` |
| Create Clinical Encounter | BLOCKED (403) | **CONSENTED ONLY** | BLOCKED (403) | BLOCKED (403) | Category: `CLINICAL_NOTES` |
| Amend Encounter Note | BLOCKED (403) | **AUTHOR ONLY** | BLOCKED (403) | BLOCKED (403) | Original doctor ID check |
| View Diagnoses Problem List | BLOCKED (403) | **CONSENTED ONLY** | BLOCKED (403) | **OWN ONLY** | Category: `DIAGNOSES` |
| Record New Diagnosis | BLOCKED (403) | **CONSENTED ONLY** | BLOCKED (403) | BLOCKED (403) | Category: `DIAGNOSES` |
| Update Diagnosis Status | BLOCKED (403) | **AUTHOR ONLY** | BLOCKED (403) | BLOCKED (403) | Author verification |

### 2.3 Diagnostic Tests & Medications

| Operation / Endpoint | `ADMIN` | `DOCTOR` | `NURSE` | `PATIENT` | Enforcement Mechanism |
|---|---|---|---|---|---|
| Order Diagnostic Lab Test | BLOCKED (403) | **CONSENTED ONLY** | BLOCKED (403) | BLOCKED (403) | Category: `LAB_REPORTS` |
| Record Lab Test Results | BLOCKED (403) | **CONSENTED ONLY** | BLOCKED (403) | BLOCKED (403) | Category: `LAB_REPORTS` |
| View Lab Reports History | BLOCKED (403) | **CONSENTED ONLY** | CARE TEAM ONLY | **OWN ONLY** | Category: `LAB_REPORTS` |
| Authorize Prescription Order | BLOCKED (403) | **CONSENTED ONLY** | BLOCKED (403) | BLOCKED (403) | Category: `PRESCRIPTIONS` |
| View Active Medications | BLOCKED (403) | **CONSENTED ONLY** | CARE TEAM ONLY | **OWN ONLY** | Category: `PRESCRIPTIONS` |
| Record Bedside Administration | BLOCKED (403) | **ALLOWED** | **CARE TEAM ONLY** | BLOCKED (403) | Active delegation check |

### 2.4 Clinical Documents & Document AI

| Operation / Endpoint | `ADMIN` | `DOCTOR` | `NURSE` | `PATIENT` | Enforcement Mechanism |
|---|---|---|---|---|---|
| Upload Health Record (PDF/Image) | BLOCKED (403) | **CONSENTED ONLY** | CARE TEAM ONLY | **OWN ONLY** | Path sandboxing & magic byte check |
| View Document Metadata & AI Extraction | BLOCKED (403) | **CONSENTED ONLY** | CARE TEAM ONLY | **OWN ONLY** | Category: `DOCUMENTS` |
| Download Original Binary File | BLOCKED (403) | **CONSENTED ONLY** | CARE TEAM ONLY | **OWN ONLY** | Strict content disposition & nosniff |
| Inline Preview Document | BLOCKED (403) | **CONSENTED ONLY** | CARE TEAM ONLY | **OWN ONLY** | Strict sandboxed CSP headers |
| Soft-Archive Document | BLOCKED (403) | BLOCKED (403) | BLOCKED (403) | **OWN ONLY** | Record owner check |
| 1-Click Explicit Document Share | BLOCKED (403) | BLOCKED (403) | BLOCKED (403) | **OWN ONLY** | Direct document grant |

### 2.5 Machine Learning Readmission Risk

| Operation / Endpoint | `ADMIN` | `DOCTOR` | `NURSE` | `PATIENT` | Enforcement Mechanism |
|---|---|---|---|---|---|
| Request ML Risk Prediction | BLOCKED (403) | **CONSENTED ONLY** | BLOCKED (403) | BLOCKED (403) | Category: `RISK_ASSESSMENTS` |
| View Historical Risk Assessments | BLOCKED (403) | **CONSENTED ONLY** | BLOCKED (403) | **OWN ONLY** | Category: `RISK_ASSESSMENTS` |
| View Model Performance Metrics | **ALLOWED** | **ALLOWED** | BLOCKED (403) | BLOCKED (403) | `/api/risk/metrics` (Accuracy/AUC) |

### 2.6 Nurse Care-Team Tasks & Availability

| Operation / Endpoint | `ADMIN` | `DOCTOR` | `NURSE` | `PATIENT` | Enforcement Mechanism |
|---|---|---|---|---|---|
| Delegate Task to Care-Team Nurse | BLOCKED (403) | **CARE TEAM ONLY**| BLOCKED (403) | BLOCKED (403) | Doctor-nurse team validation |
| View Delegated Doctor Tasks | BLOCKED (403) | **MY TASKS ONLY** | BLOCKED (403) | BLOCKED (403) | Doctor ID filter |
| View Real-Time Nurse Task Queue | BLOCKED (403) | BLOCKED (403) | **MY TASKS ONLY** | BLOCKED (403) | Nurse ID filter |
| Claim / Update Task Status | BLOCKED (403) | BLOCKED (403) | **ASSIGNED ONLY** | BLOCKED (403) | Optimistic lock (`@Version`) |
| Toggle Availability Status | **ALLOWED** | BLOCKED (403) | **OWN ONLY** | BLOCKED (403) | Nurse ID check |
| Record Bedside Vital Signs | BLOCKED (403) | **CONSENTED ONLY** | **CARE TEAM ONLY**| BLOCKED (403) | Care-team & consent check |

### 2.7 Consent Lifecycle Management

| Operation / Endpoint | `ADMIN` | `DOCTOR` | `NURSE` | `PATIENT` | Enforcement Mechanism |
|---|---|---|---|---|---|
| Grant Granular Category Consent | BLOCKED (403) | BLOCKED (403) | BLOCKED (403) | **ALLOWED** | Sovereign patient action |
| Request Access to Patient Chart | BLOCKED (403) | **ALLOWED** | BLOCKED (403) | **ALLOWED** | Access request creation |
| Respond to Access Request | BLOCKED (403) | **MY REQUESTS** | BLOCKED (403) | **MY REQUESTS** | Target participant check |
| Revoke Category Consent | **EMERGENCY ONLY** | BLOCKED (403) | BLOCKED (403) | **ALLOWED** | Immediate status `REVOKED` |
| 1-Click "Stop Sharing" (Doctor) | BLOCKED (403) | BLOCKED (403) | BLOCKED (403) | **ALLOWED** | Mass doctor revocation |

---

## 3. Strict Prohibitions & Defense Invariants

1. **System Administrator Clinical Blindness**:
   Administrators cannot view any patient's diagnoses, encounters, lab results, medications, vitals, risk scores, or clinical documents. Any attempt results in an immediate **HTTP 403 Forbidden**.
2. **Zero Cross-Patient Visibility**:
   Patients cannot view, search, or infer records belonging to any other patient in the system.
3. **Zero Non-Consented Clinical Ingress**:
   Doctors cannot query charts or perform interventions for patients who have not explicitly granted consent. Revocation takes effect instantly across all microservices.
4. **Care-Team Isolation**:
   Doctors cannot assign tasks to nurses outside their authorized team; nurses cannot view or act on tasks belonging to other nurses.
