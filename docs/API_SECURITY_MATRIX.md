# ConsentCare EHR — API Security & Authorization Matrix

## 1. Overview
This matrix defines the complete endpoint-level authorization rules, required consent categories, object-level access controls (BOLA / IDOR defenses), and expected HTTP status codes across the ConsentCare system.

---

## 2. Authentication & Public Endpoints

| Method | Endpoint | Permitted Roles | Required Consent Category | BOLA / Object Checks | Status Codes |
|---|---|---|---|---|---|
| `POST` | `/api/auth/register` | Anonymous | None | Public self-registration (Patient only). Enforces strong password rules. | 200, 400 |
| `POST` | `/api/auth/login` | Anonymous | None | Public authentication. Enforces rate limiting (10 req/min). Returns Bearer JWT. | 200, 401, 429 |
| `GET` | `/actuator/health` | Anonymous | None | Spring Boot liveness and readiness probe. | 200, 503 |

---

## 3. Patient Record & Demographics (`/api/patients`)

| Method | Endpoint | Permitted Roles | Required Consent Category | BOLA / Object Checks | Status Codes |
|---|---|---|---|---|---|
| `GET` | `/api/patients` | `ADMIN` | None | Strict admin-only access. Non-admin receives HTTP 403. | 200, 401, 403 |
| `GET` | `/api/patients/me` | `PATIENT` | None | Dynamically resolved from authenticated JWT identity (`user.id`). | 200, 401, 403 |
| `GET` | `/api/patients/{id}` | `PATIENT`, `DOCTOR` | `MEDICAL_HISTORY` | Patient can only view own record. Doctor requires active consent. Admin blocked (403). | 200, 401, 403, 404 |
| `GET` | `/api/patients/{id}/activity` | `PATIENT`, `DOCTOR` | None (Chart level) | Patient own record only; Doctor must hold active relationship/consent. | 200, 401, 403, 404 |

---

## 4. Consent Lifecycle (`/api/consents`)

| Method | Endpoint | Permitted Roles | Required Consent Category | BOLA / Object Checks | Status Codes |
|---|---|---|---|---|---|
| `POST` | `/api/consents/request` | `PATIENT` | None | Patient requests access sharing with a specific doctor. Linked patient check. | 200, 400, 401, 403 |
| `POST` | `/api/consents/grant` | `PATIENT` | None | Patient directly grants category consent to a doctor. Linked patient check. | 200, 400, 401, 403 |
| `POST` | `/api/consents/{id}/revoke` | `PATIENT`, `ADMIN` | None | Only owning patient or system admin can revoke consent. Unauthorized receives 403. | 200, 401, 403, 404 |
| `POST` | `/api/consents/revoke-doctor/{doctorId}` | `PATIENT` | None | Revokes all active consents for a specific doctor. Owning patient check. | 200, 401, 403 |
| `GET` | `/api/consents/my` | `PATIENT` | None | Returns consents granted by authenticated patient only. | 200, 401, 403 |
| `GET` | `/api/consents/my-requests` | `PATIENT` | None | Returns access requests created by authenticated patient only. | 200, 401, 403 |
| `GET` | `/api/consents/patient/{patientId}` | `PATIENT`, `DOCTOR` | `MEDICAL_HISTORY` | Evaluates caller consent permission before returning patient consents. | 200, 401, 403 |

---

## 5. Clinical Records, Encounters & Observations (`/api/clinical`)

| Method | Endpoint | Permitted Roles | Required Consent Category | BOLA / Object Checks | Status Codes |
|---|---|---|---|---|---|
| `POST` | `/api/clinical/encounters` | `DOCTOR` | `CLINICAL_NOTES` | Doctor creates encounter for patient; requires active consent. | 200, 400, 401, 403 |
| `PATCH` | `/api/clinical/encounters/{id}` | `DOCTOR` | `CLINICAL_NOTES` | Doctor must be original author AND hold active consent. Otherwise 403. | 200, 400, 401, 403, 404 |
| `GET` | `/api/clinical/encounters/patient/{patientId}` | `PATIENT`, `DOCTOR` | `CLINICAL_NOTES` | Evaluated via `ConsentSecurityEvaluator`. Admin blocked (403). | 200, 401, 403 |
| `POST` | `/api/clinical/diagnoses` | `DOCTOR` | `DIAGNOSES` | Doctor adds diagnosis; requires active consent. | 200, 400, 401, 403 |
| `PATCH` | `/api/clinical/diagnoses/{id}/status` | `DOCTOR` | `DIAGNOSES` | Doctor must be original diagnostician AND hold active consent. Otherwise 403. | 200, 400, 401, 403, 404 |
| `GET` | `/api/clinical/diagnoses/patient/{patientId}` | `PATIENT`, `DOCTOR` | `DIAGNOSES` | Evaluated via `ConsentSecurityEvaluator`. Admin blocked (403). | 200, 401, 403 |
| `POST` | `/api/clinical/lab-requests` | `DOCTOR` | `LAB_REPORTS` | Doctor orders lab test; requires active consent. | 200, 400, 401, 403 |
| `PATCH` | `/api/clinical/lab-requests/{id}/status` | `DOCTOR`, `NURSE` | `LAB_REPORTS` | Verifies doctor consent or nurse care-team delegation. Admin blocked (403). | 200, 400, 401, 403, 404 |
| `GET` | `/api/clinical/lab-requests/patient/{patientId}` | `PATIENT`, `DOCTOR`, `NURSE` | `LAB_REPORTS` | Evaluated via `ConsentSecurityEvaluator`. Admin blocked (403). | 200, 401, 403 |
| `POST` | `/api/clinical/lab-reports` | `DOCTOR` | `LAB_REPORTS` | Doctor logs lab results; requires active consent. Admin blocked (403). | 200, 400, 401, 403 |
| `GET` | `/api/clinical/lab-reports/patient/{patientId}` | `PATIENT`, `DOCTOR`, `NURSE` | `LAB_REPORTS` | Evaluated via `ConsentSecurityEvaluator`. Admin blocked (403). | 200, 401, 403 |
| `POST` | `/api/clinical/observations` | `DOCTOR`, `NURSE` | `CLINICAL_NOTES` | Doctor with consent or assigned nurse on care team. Admin blocked (403). | 200, 400, 401, 403 |
| `GET` | `/api/clinical/observations/patient/{patientId}` | `PATIENT`, `DOCTOR`, `NURSE` | `CLINICAL_NOTES` | Evaluated via `ConsentSecurityEvaluator`. Admin blocked (403). | 200, 401, 403 |

---

## 6. Prescriptions & Medication Administration (`/api/prescriptions`)

| Method | Endpoint | Permitted Roles | Required Consent Category | BOLA / Object Checks | Status Codes |
|---|---|---|---|---|---|
| `POST` | `/api/prescriptions` | `DOCTOR` | `PRESCRIPTIONS` | Doctor prescribes medication; requires active patient consent. | 200, 400, 401, 403 |
| `GET` | `/api/prescriptions/patient/{patientId}` | `PATIENT`, `DOCTOR`, `NURSE` | `PRESCRIPTIONS` | Evaluated via `ConsentSecurityEvaluator`. Admin blocked (403). | 200, 401, 403 |
| `GET` | `/api/prescriptions/patient/{patientId}/paged` | `PATIENT`, `DOCTOR`, `NURSE` | `PRESCRIPTIONS` | Evaluated via `ConsentSecurityEvaluator`. Admin blocked (403). | 200, 401, 403 |
| `POST` | `/api/prescriptions/administrations` | `NURSE`, `DOCTOR` | `PRESCRIPTIONS` | Nurse must belong to active care team for patient; Doctor must hold consent. | 200, 400, 401, 403, 404 |

---

## 7. Clinical Documents & AI Processing (`/api/documents`)

| Method | Endpoint | Permitted Roles | Required Consent Category | BOLA / Object Checks | Status Codes |
|---|---|---|---|---|---|
| `POST` | `/api/documents/upload` | `PATIENT`, `DOCTOR`, `NURSE` | `DOCUMENTS` | Patient can upload only to own profile; Doctor/Nurse requires consent. Validates magic bytes, extension, size (20MB), and sanitizes filename. | 200, 400, 401, 403 |
| `GET` | `/api/documents/patient/{patientId}` | `PATIENT`, `DOCTOR`, `NURSE` | `DOCUMENTS` | Evaluated via `ConsentSecurityEvaluator`. Admin blocked (403). | 200, 401, 403 |
| `GET` | `/api/documents/patient/{patientId}/paged` | `PATIENT`, `DOCTOR`, `NURSE` | `DOCUMENTS` | Evaluated via `ConsentSecurityEvaluator`. Admin blocked (403). | 200, 401, 403 |
| `GET` | `/api/documents/{id}` | `PATIENT`, `DOCTOR`, `NURSE` | `DOCUMENTS` | Validates caller is owning patient, explicitly shared doctor, or holding consent. | 200, 401, 403, 404 |
| `PATCH` | `/api/documents/{id}` | `PATIENT`, `DOCTOR` | `DOCUMENTS` | Patient modifies own doc; Doctor requires active consent. | 200, 400, 401, 403, 404 |
| `DELETE` | `/api/documents/{id}` | `PATIENT` | None | Soft-archives document. Owning patient only. | 200, 401, 403, 404 |
| `POST` | `/api/documents/{id}/share` | `PATIENT` | None | Patient explicitly shares document with a doctor. Owning patient check. | 200, 401, 403, 404 |
| `DELETE` | `/api/documents/{id}/share/{doctorId}`| `PATIENT` | None | Patient revokes explicit document share. Owning patient check. | 200, 401, 403, 404 |
| `GET` | `/api/documents/{id}/download` | `PATIENT`, `DOCTOR`, `NURSE` | `DOCUMENTS` | Enforces object access check. Emits `X-Content-Type-Options: nosniff` header. | 200, 401, 403, 404 |
| `GET` | `/api/documents/{id}/preview` | `PATIENT`, `DOCTOR`, `NURSE` | `DOCUMENTS` | Enforces object access check. Emits strict CSP and nosniff headers. | 200, 401, 403, 404 |

---

## 8. Clinical Risk Prediction & AI Advisory (`/api/risk`)

| Method | Endpoint | Permitted Roles | Required Consent Category | BOLA / Object Checks | Status Codes |
|---|---|---|---|---|---|
| `POST` | `/api/risk/patient/{patientId}` | `DOCTOR` | `RISK_ASSESSMENTS` | Doctor requests supervised ML prediction; requires active consent. Admin blocked (403). | 200, 400, 401, 403, 404 |
| `GET` | `/api/risk/patient/{patientId}` | `DOCTOR`, `PATIENT` | `RISK_ASSESSMENTS` | Evaluated via `ConsentSecurityEvaluator`. Admin blocked (403). | 200, 401, 403, 404 |
| `GET` | `/api/risk/metrics` | `DOCTOR`, `ADMIN` | None | Returns verified UCI model performance metrics (Accuracy, ROC-AUC). | 200, 401, 403 |
| `GET` | `/api/risk/health` | `ADMIN` | None | Internal microservice health probe. Strictly Admin only. | 200, 401, 403, 502 |

---

## 9. Nurse Workflow & Task Delegation (`/api/nurses`)

| Method | Endpoint | Permitted Roles | Required Consent Category | BOLA / Object Checks | Status Codes |
|---|---|---|---|---|---|
| `GET` | `/api/nurses` | `DOCTOR`, `ADMIN` | None | Lists clinic nurse staff for task assignment. | 200, 401, 403 |
| `GET` | `/api/nurses/my-tasks` | `NURSE` | None | Returns tasks assigned to authenticated nurse only. | 200, 401, 403 |
| `GET` | `/api/nurses/doctor-tasks` | `DOCTOR` | None | Returns tasks ordered by authenticated doctor only. | 200, 401, 403 |
| `POST` | `/api/nurses/tasks` | `DOCTOR` | None (Relationship check)| Doctor assigns task; verifies doctor consent for patient and nurse care-team membership. | 200, 400, 401, 403 |
| `PATCH` | `/api/nurses/tasks/{id}/status` | `NURSE` | None | Nurse must be assigned to task. Validates state machine transitions. | 200, 400, 401, 403, 404 |
| `PATCH` | `/api/nurses/{id}/availability` | `NURSE`, `ADMIN` | None | Nurse can update own availability; Admin can update any. Others 403. | 200, 400, 401, 403, 404 |

---

## 10. Notifications & Real-Time Events (`/api/notifications`)

| Method | Endpoint | Permitted Roles | Required Consent Category | BOLA / Object Checks | Status Codes |
|---|---|---|---|---|---|
| `GET` | `/api/notifications` | Any Authenticated | None | Returns top 100 notifications for authenticated user only. | 200, 401, 403 |
| `GET` | `/api/notifications/unread-count` | Any Authenticated | None | Returns unread count for authenticated user only. | 200, 401, 403 |
| `PATCH` | `/api/notifications/{id}/read` | Any Authenticated | None | User can mark only own notifications as read. | 204, 401, 403 |
| `POST` | `/api/notifications/read-all` | Any Authenticated | None | Marks all unread notifications for authenticated user as read. | 204, 401, 403 |
| `GET` | `/api/notifications/stream` | Any Authenticated | None | SSE event stream. Authentication strictly required (Bearer or query token). | 200, 401, 403 |

---

## 11. System Administration (`/api/admin`)

| Method | Endpoint | Permitted Roles | Required Consent Category | BOLA / Object Checks | Status Codes |
|---|---|---|---|---|---|
| `POST` | `/api/admin/users` | `ADMIN` | None | Creates DOCTOR or NURSE staff profiles. | 200, 400, 401, 403 |
| `POST` | `/api/admin/doctors` | `ADMIN` | None | Creates doctor profile with license and department. | 200, 400, 401, 403 |
| `POST` | `/api/admin/nurses` | `ADMIN` | None | Creates nurse profile with department. | 200, 400, 401, 403 |
| `POST` | `/api/admin/patients` | `ADMIN` | None | Creates walk-in patient profile. | 200, 400, 401, 403 |
| `GET` | `/api/admin/users` | `ADMIN` | None | Lists system user accounts. | 200, 401, 403 |
| `PATCH` | `/api/admin/users/{id}/status` | `ADMIN` | None | Activates or suspends user account. | 204, 401, 403 |
| `POST` | `/api/admin/assign-nurse` | `ADMIN` | None | Assigns nurse to doctor's active care team. | 204, 400, 401, 403 |
| `GET` | `/api/admin/departments` | `ADMIN` | None | Lists hospital departments. | 200, 401, 403 |
| `GET` | `/api/admin/audit-logs` | `ADMIN` | None | Paged system audit logs. Clamped: `page >= 0`, `1 <= size <= 100`. | 200, 401, 403 |
| `GET` | `/api/agent/health` | `ADMIN` | None | Internal agent-service health check. | 200, 401, 403, 502 |

---

## 12. Retired Endpoints (Permanent Attack Surface Reduction)

| Method | Endpoint | Status | Replacement / Justification |
|---|---|---|---|
| `POST` | `/api/agent/risk-aware-alert` | **RETIRED (404)** | Prototype endpoint without consent gating. Removed to eliminate attack surface. |
| `POST` | `/api/agent/summarize` | **RETIRED (404)** | Prototype raw text summarizer. Superseded by grounded Document AI (`/api/documents/upload`). |
| `POST` | `/api/risk/predict` | **RETIRED (404)** | Unauthenticated raw prediction endpoint. Superseded by consent-gated `/api/risk/patient/{patientId}`. |

