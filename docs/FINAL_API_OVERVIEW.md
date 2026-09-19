# ConsentCare EHR — Final API Specification & Overview

> **Classification**: Production API Reference  
> **Baseline Version**: v1.0-research-demo  
> **Security Standard**: OWASP ASVS 5.0.0 Level 2 / OWASP API Security Top 10:2023  
> **Base Ingress URL**: `http://localhost:81/api` (via Frontend Nginx Proxy) or `http://localhost:8081/api` (Core Gateway Direct)

---

## 1. Authentication & Security Protocol

All requests to private endpoints require a JSON Web Token (JWT) passed via the standard HTTP Authorization header:
```http
Authorization: Bearer <JWT_TOKEN>
```
* **Algorithm**: HMAC-SHA256 (`HS256`)
* **Token Lifetime**: 24 Hours (`86,400,000 ms`)
* **Claims**: `sub` (username), `roles` (list of authorities, e.g. `ROLE_DOCTOR`), `userId` (numeric user ID), `iat`, `exp`
* **Error Semantics**:
  * `401 Unauthorized`: Missing, expired, or cryptographically invalid token.
  * `403 Forbidden`: Authenticated caller lacks requisite RBAC authority or patient ABAC consent grant.
  * `429 Too Many Requests`: Rate limit exceeded (Bucket4j token bucket).

---

## 2. API Endpoint Catalog

### 2.1 Authentication Controller (`/api/auth`)

| Method | Path | Auth Required | Permitted Roles | Description | Request Body | Response Body |
|---|---|---|---|---|---|---|
| `POST` | `/api/auth/register` | No | Anonymous | Patient self-registration with strong password policy | `RegisterRequest` | `AuthResponse` (JWT + User Profile) |
| `POST` | `/api/auth/login` | No | Anonymous | Authenticates credentials with rate-limiting (10/min) | `LoginRequest` | `AuthResponse` (JWT + User Profile) |

### 2.2 Patient Demographics Controller (`/api/patients`)

| Method | Path | Auth Required | Permitted Roles | Consent Scope | Description |
|---|---|---|---|---|---|
| `GET` | `/api/patients` | Yes | `ROLE_ADMIN` | None | Administrative cohort listing |
| `GET` | `/api/patients/me` | Yes | `ROLE_PATIENT` | Self | Retrieves profile of currently authenticated patient |
| `GET` | `/api/patients/{id}` | Yes | `ROLE_PATIENT`, `ROLE_DOCTOR` | `MEDICAL_HISTORY` | Full patient demographic record; doctor requires active consent |
| `GET` | `/api/patients/{id}/activity`| Yes | `ROLE_PATIENT`, `ROLE_DOCTOR` | None (Chart) | Recent audit activities associated with patient |

### 2.3 Doctor Management Controller (`/api/doctors`)

| Method | Path | Auth Required | Permitted Roles | Description |
|---|---|---|---|---|
| `GET` | `/api/doctors` | No/Yes | Any | Directory search of registered physicians |
| `GET` | `/api/doctors/paged` | No/Yes | Any | Paginated directory search (`page`, `size`, `sort`) |
| `GET` | `/api/doctors/me` | Yes | `ROLE_DOCTOR` | Retrieves practitioner profile for current physician |
| `GET` | `/api/doctors/my/patients` | Yes | `ROLE_DOCTOR` | List of patients who have granted active consent |
| `GET` | `/api/doctors/my/patients/paged` | Yes | `ROLE_DOCTOR` | Paginated authorized patient cohort |
| `GET` | `/api/doctors/my/requests` | Yes | `ROLE_DOCTOR` | Incoming patient access requests |
| `POST` | `/api/doctors/requests/{id}/respond` | Yes | `ROLE_DOCTOR` | Approves or rejects an incoming access request |
| `GET` | `/api/doctors/my/tasks` | Yes | `ROLE_DOCTOR` | Nurse tasks delegated by this physician |
| `GET` | `/api/doctors/my/nurses` | Yes | `ROLE_DOCTOR` | Assigned care-team nurses |

### 2.4 Consent Lifecycle Controller (`/api/consents`)

| Method | Path | Auth Required | Permitted Roles | Description |
|---|---|---|---|---|
| `POST` | `/api/consents/grant` | Yes | `ROLE_PATIENT` | Sovereign grant of granular category consent to a doctor |
| `POST` | `/api/consents/request` | Yes | `ROLE_PATIENT` | Patient initiates access request to a physician |
| `POST` | `/api/consents/{id}/revoke` | Yes | `ROLE_PATIENT`, `ROLE_ADMIN` | Immediately revokes specific consent record |
| `POST` | `/api/consents/revoke-doctor/{doctorId}` | Yes | `ROLE_PATIENT` | 1-Click "Stop Sharing": Revokes all categories for doctor |
| `GET` | `/api/consents/my` | Yes | `ROLE_PATIENT` | Active and historical consents for current patient |
| `GET` | `/api/consents/my-requests` | Yes | `ROLE_PATIENT` | Access requests created by current patient |
| `GET` | `/api/consents/patient/{patientId}` | Yes | `ROLE_PATIENT`, `ROLE_DOCTOR` | Consents query evaluated via `ConsentSecurityEvaluator` |

### 2.5 Clinical Records & Encounters (`/api/clinical`)

| Method | Path | Auth Required | Permitted Roles | Consent Scope | Description |
|---|---|---|---|---|---|
| `POST` | `/api/clinical/encounters` | Yes | `ROLE_DOCTOR` | `CLINICAL_NOTES` | Creates new longitudinal clinical encounter |
| `PATCH` | `/api/clinical/encounters/{id}` | Yes | `ROLE_DOCTOR` | `CLINICAL_NOTES` | Updates encounter (author verification enforced) |
| `GET` | `/api/clinical/encounters/patient/{patientId}` | Yes | `ROLE_PATIENT`, `ROLE_DOCTOR` | `CLINICAL_NOTES` | Retrieves encounter timeline |
| `POST` | `/api/clinical/diagnoses` | Yes | `ROLE_DOCTOR` | `DIAGNOSES` | Appends problem-list diagnosis |
| `PATCH` | `/api/clinical/diagnoses/{id}/status` | Yes | `ROLE_DOCTOR` | `DIAGNOSES` | Resolves or updates diagnosis status |
| `GET` | `/api/clinical/diagnoses/patient/{patientId}` | Yes | `ROLE_PATIENT`, `ROLE_DOCTOR` | `DIAGNOSES` | Active and historical diagnoses |
| `POST` | `/api/clinical/lab-requests` | Yes | `ROLE_DOCTOR` | `LAB_REPORTS` | Orders diagnostic laboratory panel |
| `PATCH` | `/api/clinical/lab-requests/{id}/status` | Yes | `ROLE_DOCTOR`, `ROLE_NURSE` | `LAB_REPORTS` | Transitions lab order (`ORDERED` -> `COMPLETED`) |
| `GET` | `/api/clinical/lab-requests/patient/{patientId}` | Yes | `ROLE_PATIENT`, `ROLE_DOCTOR`, `ROLE_NURSE` | `LAB_REPORTS` | Diagnostic orders list |
| `POST` | `/api/clinical/lab-reports` | Yes | `ROLE_DOCTOR` | `LAB_REPORTS` | Records laboratory test results |
| `GET` | `/api/clinical/lab-reports/patient/{patientId}` | Yes | `ROLE_PATIENT`, `ROLE_DOCTOR`, `ROLE_NURSE` | `LAB_REPORTS` | Diagnostic lab results history |
| `POST` | `/api/clinical/observations` | Yes | `ROLE_DOCTOR`, `ROLE_NURSE` | `CLINICAL_NOTES` | Adds clinical observations and notes |
| `GET` | `/api/clinical/observations/patient/{patientId}` | Yes | `ROLE_PATIENT`, `ROLE_DOCTOR`, `ROLE_NURSE` | `CLINICAL_NOTES` | Clinical observation history |

### 2.6 Prescriptions Controller (`/api/prescriptions`)

| Method | Path | Auth Required | Permitted Roles | Consent Scope | Description |
|---|---|---|---|---|---|
| `POST` | `/api/prescriptions` | Yes | `ROLE_DOCTOR` | `PRESCRIPTIONS` | Issues prescription order with multiple medication items |
| `GET` | `/api/prescriptions/patient/{patientId}` | Yes | `ROLE_PATIENT`, `ROLE_DOCTOR`, `ROLE_NURSE` | `PRESCRIPTIONS` | Active and historical medications |
| `GET` | `/api/prescriptions/patient/{patientId}/paged` | Yes | `ROLE_PATIENT`, `ROLE_DOCTOR`, `ROLE_NURSE` | `PRESCRIPTIONS` | Paginated medication history |
| `POST` | `/api/prescriptions/administrations` | Yes | `ROLE_NURSE`, `ROLE_DOCTOR` | `PRESCRIPTIONS` | Bedside nurse medication administration record (MAR) |

### 2.7 Documents & AI Ingestion Controller (`/api/documents`)

| Method | Path | Auth Required | Permitted Roles | Consent Scope | Description |
|---|---|---|---|---|---|
| `POST` | `/api/documents/upload` | Yes | `ROLE_PATIENT`, `ROLE_DOCTOR`, `ROLE_NURSE` | `DOCUMENTS` | Uploads PDF/image document with automatic OCR and AI extraction |
| `GET` | `/api/documents/patient/{patientId}` | Yes | `ROLE_PATIENT`, `ROLE_DOCTOR`, `ROLE_NURSE` | `DOCUMENTS` | Document library for patient |
| `GET` | `/api/documents/patient/{patientId}/paged` | Yes | `ROLE_PATIENT`, `ROLE_DOCTOR`, `ROLE_NURSE` | `DOCUMENTS` | Paginated document library |
| `GET` | `/api/documents/{id}` | Yes | `ROLE_PATIENT`, `ROLE_DOCTOR`, `ROLE_NURSE` | `DOCUMENTS` | Document metadata and AI extraction summary |
| `PATCH` | `/api/documents/{id}` | Yes | `ROLE_PATIENT`, `ROLE_DOCTOR` | `DOCUMENTS` | Updates document metadata/title |
| `DELETE` | `/api/documents/{id}` | Yes | `ROLE_PATIENT` | Self | Soft-archives document (Patient only) |
| `POST` | `/api/documents/{id}/share` | Yes | `ROLE_PATIENT` | Self | Grants explicit document access to specific doctor |
| `DELETE` | `/api/documents/{id}/share/{doctorId}` | Yes | `ROLE_PATIENT` | Self | Revokes explicit document share |
| `GET` | `/api/documents/{id}/download` | Yes | `ROLE_PATIENT`, `ROLE_DOCTOR`, `ROLE_NURSE` | `DOCUMENTS` | Secure binary stream (`nosniff` header enforced) |
| `GET` | `/api/documents/{id}/preview` | Yes | `ROLE_PATIENT`, `ROLE_DOCTOR`, `ROLE_NURSE` | `DOCUMENTS` | Sandboxed inline preview stream |

### 2.8 Supervised Clinical Risk Controller (`/api/risk`)

| Method | Path | Auth Required | Permitted Roles | Consent Scope | Description |
|---|---|---|---|---|---|
| `POST` | `/api/risk/patient/{patientId}` | Yes | `ROLE_DOCTOR` | `RISK_ASSESSMENTS` | Executes supervised Random Forest readmission risk prediction |
| `GET` | `/api/risk/patient/{patientId}` | Yes | `ROLE_PATIENT`, `ROLE_DOCTOR` | `RISK_ASSESSMENTS` | Historical risk assessment records |
| `GET` | `/api/risk/metrics` | Yes | `ROLE_DOCTOR`, `ROLE_ADMIN` | None | Verified UCI Diabetes model metrics (Acc: 0.6898, AUC: 0.6478) |
| `GET` | `/api/risk/health` | Yes | `ROLE_ADMIN` | None | Internal microservice health probe |

### 2.9 Nurse Workflow Controller (`/api/nurses`)

| Method | Path | Auth Required | Permitted Roles | Description |
|---|---|---|---|---|
| `GET` | `/api/nurses` | Yes | `ROLE_DOCTOR`, `ROLE_ADMIN` | Staff directory of nurses for task assignment |
| `GET` | `/api/nurses/my-tasks` | Yes | `ROLE_NURSE` | Real-time task queue assigned to current nurse |
| `GET` | `/api/nurses/doctor-tasks` | Yes | `ROLE_DOCTOR` | Delegated tasks created by current doctor |
| `POST` | `/api/nurses/tasks` | Yes | `ROLE_DOCTOR` | Assigns task to nurse with priority and patient link |
| `PATCH` | `/api/nurses/tasks/{id}/status` | Yes | `ROLE_NURSE` | Updates task state (`PENDING` -> `IN_PROGRESS` -> `COMPLETED`) |
| `PATCH` | `/api/nurses/{id}/availability` | Yes | `ROLE_NURSE`, `ROLE_ADMIN` | Toggles nurse availability status (`AVAILABLE` / `BUSY`) |

### 2.10 Real-Time Notifications Controller (`/api/notifications`)

| Method | Path | Auth Required | Permitted Roles | Description |
|---|---|---|---|---|
| `GET` | `/api/notifications` | Yes | Any Authenticated | Top 100 alerts/notifications for current user |
| `GET` | `/api/notifications/unread-count` | Yes | Any Authenticated | Unread notification count badge |
| `PATCH` | `/api/notifications/{id}/read` | Yes | Any Authenticated | Marks specific notification as read |
| `POST` | `/api/notifications/read-all` | Yes | Any Authenticated | Marks all notifications as read |
| `GET` | `/api/notifications/stream` | Yes | Any Authenticated | Persistent Server-Sent Events (SSE) stream |

### 2.11 FHIR Data Controller (`/api/fhir`)

| Method | Path | Auth Required | Permitted Roles | Consent Scope | Description |
|---|---|---|---|---|---|
| `GET` | `/api/fhir/Patient/{id}` | Yes | Authenticated | Any Active | FHIR R4-aligned Patient resource JSON |
| `GET` | `/api/fhir/Patient/{id}/$everything` | Yes | Authenticated | Any Active | FHIR R4-aligned Bundle of complete patient record |
| `GET` | `/api/fhir/Practitioner/{userId}` | Yes | Authenticated | None | FHIR R4-aligned Practitioner resource |
| `GET` | `/api/fhir/Observation?patient={id}` | Yes | Authenticated | Any Active | FHIR R4-aligned Observation collection |
| `GET` | `/api/fhir/Condition?patient={id}` | Yes | Authenticated | Any Active | FHIR R4-aligned Condition collection |
| `GET` | `/api/fhir/MedicationRequest?patient={id}`| Yes | Authenticated | Any Active | FHIR R4-aligned MedicationRequest collection |

### 2.12 System Administration Controller (`/api/admin`)

| Method | Path | Auth Required | Permitted Roles | Description |
|---|---|---|---|---|
| `GET` | `/api/admin/users` | Yes | `ROLE_ADMIN` | Staff user account management |
| `POST` | `/api/admin/users` | Yes | `ROLE_ADMIN` | Onboards new clinical staff user account |
| `POST` | `/api/admin/doctors` | Yes | `ROLE_ADMIN` | Creates physician profile with license and department |
| `POST` | `/api/admin/nurses` | Yes | `ROLE_ADMIN` | Creates nurse profile with department |
| `POST` | `/api/admin/patients` | Yes | `ROLE_ADMIN` | Creates walk-in patient profile |
| `PATCH` | `/api/admin/users/{id}/status` | Yes | `ROLE_ADMIN` | Activates or suspends user account |
| `POST` | `/api/admin/assign-nurse` | Yes | `ROLE_ADMIN` | Maps nurse to doctor's active care team |
| `GET` | `/api/admin/departments` | Yes | `ROLE_ADMIN` | Lists hospital departments |
| `GET` | `/api/admin/audit-logs` | Yes | `ROLE_ADMIN` | Paginated immutable audit trail (`page`, `size`) |
| `GET` | `/api/agent/health` | Yes | `ROLE_ADMIN` | Internal Document AI health probe |

---

## 3. Standard Response Format & Error Codes

### 3.1 Standard Error Response Structure
```json
{
  "timestamp": "2026-09-19T14:30:00.000Z",
  "status": 403,
  "error": "Forbidden",
  "message": "Access Denied: Patient consent is required for category MEDICAL_HISTORY",
  "path": "/api/patients/4"
}
```

### 3.2 Key HTTP Status Codes
* `200 OK`: Successful synchronous retrieval or state update.
* `201 Created`: Successful entity creation (upload, encounter, prescription).
* `204 No Content`: Successful action with empty response body (marking read, status updates).
* `400 Bad Request`: Validation failure (malformed payload, invalid state transition, optimistic lock conflict).
* `401 Unauthorized`: Missing or invalid JWT credentials.
* `403 Forbidden`: Insufficient role authority or absent/revoked patient consent.
* `404 Not Found`: Resource ID does not exist or has been soft-deleted.
* `429 Too Many Requests`: IP-based rate limit exceeded.
* `502 Bad Gateway`: Downstream microservice (Risk or Agent service) is unreachable.
