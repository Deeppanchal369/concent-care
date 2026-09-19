# ConsentCare EHR — Final System Inventory

This inventory documents the actual implementation, components, configurations, and models across the ConsentCare Electronic Health Record (EHR) system as of Phase 7.

---

## 1. Frontend Architecture

* **Framework**: React 18 with TypeScript, Vite 8 build toolchain, Tailwind CSS
* **Routing**: React Router DOM with lazy-loaded dynamic code splitting (`React.lazy()` & `<Suspense>`)
* **Bundle Chunks**:
  * Landing / Auth Shell: `dist/assets/index-*.js` (312.4 kB)
  * Patient / Provider Dashboard: `dist/assets/Dashboard-*.js` (60.45 kB)
  * Longitudinal Clinical Detail: `dist/assets/PatientDetail-*.js` (73.16 kB)
  * Document Center: `dist/assets/DocumentCenter-*.js` (40.20 kB)
  * System Administration: `dist/assets/Admin-*.js` (15.27 kB)

### 1.1 Application Routes
| Route | Component | Access Control | Purpose |
|---|---|---|---|
| `/` | `Landing.tsx` | Public | Healthcare product landing page with role-based navigation |
| `/login` | `Login.tsx` | Public | Credential authentication with rate-limit backoff |
| `/register` | `Register.tsx` | Public | Patient registration with validation |
| `/dashboard` | `Dashboard.tsx` | Authenticated (All Roles) | Context-aware dashboard for Patient, Doctor, Nurse, Admin |
| `/patients/:id` | `PatientDetail.tsx` | Doctor, Nurse, Patient (Self) | Longitudinal EHR chart (Vitals, Encounters, Diagnoses, Labs, Rx) |
| `/documents` | `DocumentCenter.tsx` | Patient, Doctor | Document upload, categorization, preview, download, and sharing |
| `/admin` | `Admin.tsx` | Admin Only | User provisioning, role assignment, system audit logs, and settings |

### 1.2 Responsive Breakpoint Support
Tailwind CSS responsive design validated across viewports:
* Large Desktop: `1920×1080`, `1440×900`
* Standard Desktop: `1366×768`, `1024×768`
* Tablet: `768×1024` (iPad portrait/landscape)
* Mobile: `430×932` (iPhone 14 Pro Max), `390×844` (iPhone 12/13/14)

---

## 2. Backend Architecture (`core-service`)

* **Runtime**: Java 17, Spring Boot 3.3.4
* **Security Framework**: Spring Security 6, Stateless JWT (HMAC-SHA256), `@EnableMethodSecurity`
* **Audit & Versioning**: Hibernate Envers with revision entity tracking, `audit_logs` & `access_logs`

### 2.1 Controllers & Endpoints
| Controller | Base Path | Key Endpoints | Protection |
|---|---|---|---|
| `AuthController` | `/api/auth` | `/login`, `/register`, `/me` | Public login/register; Authenticated `/me` |
| `PatientController` | `/api/patients` | `GET /`, `GET /me`, `GET /{id}`, `GET /{id}/activity` | Gated by `ConsentSecurityEvaluator`; `GET /` is Admin only |
| `DoctorController` | `/api/doctors` | `GET /paged`, `GET /my/patients`, `GET /my/nurses` | Role-based; cohort filtered by active consent |
| `NurseController` | `/api/nurses` | `GET /`, `GET /my/tasks`, `POST /tasks`, `PATCH /tasks/{id}/status` | Gated to assigned care teams and active patient consents |
| `ConsentController` | `/api/consents` | `POST /request`, `POST /grant`, `POST /{id}/revoke`, `POST /revoke-doctor/{id}`, `GET /my` | Patient ownership enforced; non-owner access yields 403 |
| `DocumentController` | `/api/documents` | `POST /upload`, `GET /patient/{id}`, `GET /{id}/preview`, `GET /{id}/download`, `PATCH /{id}/metadata` | Strict category consent & sharing checks |
| `ClinicalRecordController` | `/api/clinical` | `POST /encounters`, `POST /diagnoses`, `POST /lab-reports`, `POST /observations` | Consent-checked for `MEDICAL_HISTORY` / `LAB_REPORTS` |
| `PrescriptionController` | `/api/prescriptions` | `POST /`, `GET /patient/{id}`, `POST /administrations` | Checked for `PRESCRIPTIONS` consent; care-team delegation |
| `RiskController` | `/api/risk` | `POST /evaluate`, `GET /history/{patientId}`, `GET /health` | Consent-checked for `RISK_ASSESSMENTS`; `/health` Admin only |
| `AgentController` | `/api/agent` | `GET /health` | Admin only diagnostic health check |
| `NotificationController` | `/api/notifications` | `GET /`, `GET /stream`, `PATCH /{id}/read` | Authenticated user notifications and SSE stream |
| `AdminController` | `/api/admin` | `POST /users`, `GET /audit-logs`, `GET /users` | Strictly `@PreAuthorize("hasRole('ADMIN')")` |

### 2.2 Core Services
* `ConsentSecurityEvaluator`: Centralized evaluation of patient-doctor consent boundaries and least-privilege checks.
* `ConsentService`: Consent request, direct grant, immediate revocation, and expiration management.
* `DocumentService`: File upload sanitization, binary signature validation, sandboxed storage, and document sharing.
* `AuditService`: Immutable event auditing with automated regex redaction of sensitive credentials.
* `ClinicalRecordService`: Encounters, diagnoses, lab reports, observations lifecycle with non-destructive amendments.
* `PrescriptionService`: Prescription authoring, dispensing items, and nurse medication administration verification.
* `NurseService`: Care-team task delegation, pessimistic write concurrency locking, and status state machine.
* `NotificationService`: Real-time Server-Sent Events (SSE) and persistent database notification routing.
* `RiskEvaluationService`: Integration with Python ML microservice for supervised readmission risk scoring.

---

## 3. Database Architecture (PostgreSQL 16)

* **Database Engine**: PostgreSQL 16-alpine on port `5432` (host mapped to `5433`)
* **Schema Migration Engine**: Flyway (17 forward-only migrations applied)
* **Current Flyway Version**: `17` (`V17__security_and_performance_hardening.sql`)

### 3.1 Primary Entities & Tables
1. `users` / `user_roles`: Core identity, BCrypt passwords, role assignments (`ADMIN`, `DOCTOR`, `NURSE`, `PATIENT`).
2. `patients`: Longitudinal demographic and clinical profiles linked to `users`.
3. `doctors`: Clinical specialty, licensing, and user identity.
4. `nurses`: Nurse availability status (`AVAILABLE`, `BUSY`), license number, user identity.
5. `doctor_nurse_assignments`: Active care-team pairings between doctors and nurses.
6. `consents`: Patient-granted permissions with category, purpose, validity window, and revocation flag.
7. `consent_access_requests`: Formal access requests between patient and doctor.
8. `documents`: Medical documents, MIME type, sandboxed file path, SHA-256 hash, and upload metadata.
9. `document_shares`: Direct document sharing records with doctors.
10. `clinical_encounters` & `encounter_amendments`: Longitudinal doctor encounters with non-destructive addenda.
11. `diagnoses`: Chronic and acute diagnosis tracking with ICD-10 codes and resolution states.
12. `lab_reports` & `lab_test_results`: Quantitative and qualitative clinical lab reports.
13. `observations`: Vital sign measurements (BP, heart rate, temperature, SpO2, respiratory rate).
14. `prescriptions` & `prescription_items`: Medication therapy with dosages, durations, and refill allowances.
15. `medication_administrations`: Nurse bedside administration records with nurse ID and timestamps.
16. `nurse_tasks`: Clinical delegation tasks (`ASSIGNED` -> `ACCEPTED` -> `IN_PROGRESS` -> `COMPLETED`).
17. `notifications`: Real-time user notifications with delivery state and read markers.
18. `document_ai_analyses`: Grounded Ollama extraction results, lab lists, medications, and summary.
19. `risk_predictions`: Persisted Random Forest 30-day readmission risk assessments.
20. `audit_logs` & `access_logs`: Immutable clinical and administrative access logs with actor attribution.

### 3.2 Performance Indexes (V17 & Historical)
* `idx_audit_logs_timestamp_actor` on `audit_logs(timestamp DESC, actor_username)`
* `idx_audit_logs_action_result` on `audit_logs(action, result)`
* `idx_access_logs_patient_accessed` on `access_logs(patient_id, accessed_at DESC)`
* `idx_observations_patient_observed` on `observations(patient_id, observed_at DESC)`
* `idx_prescriptions_patient_created` on `prescriptions(patient_id, created_at DESC)`
* `idx_notifications_recipient_created` on `notifications(recipient_user_id, created_at DESC)`
* `idx_consents_eval` on `consents(patient_id, doctor_id, revoked, expires_at)`

---

## 4. Artificial Intelligence & Machine Learning Architecture

### 4.1 Document AI Service (`agent-service`)
* **Framework**: Python 3.11, FastAPI, Uvicorn
* **Host Port Binding**: `127.0.0.1:8002` (loopback only)
* **Default AI Provider**: Local Ollama (via host bridge `http://host.docker.internal:11434`)
* **Local Model**: `llama3.2:1b` (verified authentic locally running weights)
* **OCR Engine**: Tesseract OCR (`tesseract-ocr`, `tesseract-ocr-eng`, `pytesseract`)
* **Safety & Alignment**:
  * Grounded clinical extraction strictly anchored to document text.
  * Zero-hallucination mandate: missing symptoms or unmentioned data return `"Not detected"`.
  * Adversarial prompt injection defense: inputs isolated within XML delimiters and treated as inert data.
  * Research disclaimer requirement: AI outputs displayed with mandatory clinical decision-support notices.

### 4.2 Supervised ML Risk Service (`risk-service`)
* **Framework**: Python 3.11, FastAPI, scikit-learn, joblib, pandas, numpy
* **Host Port Binding**: `127.0.0.1:8001` (loopback only)
* **Model Architecture**: Random Forest Classifier (`RandomForestClassifier`, 200 estimators)
* **Model Version**: `readmission-risk v1.0`
* **Training Dataset**: UCI Diabetes 130-US Hospitals (1999–2008) dataset
* **Training Volume**: 101,766 clinical encounters
* **Model Performance Metrics**:
  * Accuracy: `0.6898` (68.98%)
  * ROC-AUC Score: `0.6478`
* **Inference Rule**:
  * Complete demographic and clinical encounter data -> 30-day readmission probability.
  * Missing or incomplete clinical encounter data -> Returns `INSUFFICIENT_DATA` (zero fabrication).

---

## 5. Infrastructure & Container Orchestration

* **Orchestrator**: Docker Compose
* **Network**: Internal Docker bridge network (`consentcare_default`)

| Service Name | Container Name | Image / Base | Internal Port | Host Port | Bound IP | Healthcheck |
|---|---|---|---|---|---|---|
| `postgres` | `consentcare-postgres` | `postgres:16-alpine` | `5432` | `5433` | `0.0.0.0` | `pg_isready -U consentcare` |
| `risk-service` | `consentcare-risk-service` | `python:3.11-slim` | `8001` | `8001` | `127.0.0.1` | `GET /health` |
| `agent-service` | `consentcare-agent-service` | `python:3.11-slim` | `8002` | `8002` | `127.0.0.1` | `GET /health` |
| `core-service` | `consentcare-core-service` | `eclipse-temurin:17-jre-alpine` | `8080` | `8081` | `0.0.0.0` | `wget /actuator/health` |
| `frontend` | `consentcare-frontend` | `nginx:alpine` | `80` | `81` | `0.0.0.0` | Nginx HTTP probe |

---

## 6. Configuration & Environment Variables

| Variable | Scope | Default in Development | Description |
|---|---|---|---|
| `DB_HOST` | `core-service` | `postgres` | Internal database hostname |
| `DB_PORT` | `core-service` | `5432` | Internal database port |
| `DB_NAME` | `core-service` | `consentcare` | PostgreSQL database name |
| `DB_USER` | `core-service` | `consentcare` | Database user |
| `DB_PASSWORD` | `core-service` | `consentcare` | Database password |
| `JWT_SECRET` | `core-service` | `consentcare-super-secret-jwt-...` | HMAC-SHA256 signing secret |
| `JWT_EXPIRATION_MS` | `core-service` | `86400000` (24 hours) | Token validity period |
| `AI_PROVIDER` | `agent-service` | `ollama` | Document AI provider (`ollama` / `gemini`) |
| `OLLAMA_BASE_URL` | `agent-service` | `http://host.docker.internal:11434` | Host Ollama bridge endpoint |
| `OLLAMA_MODEL` | `agent-service` | `llama3.2:1b` | Local LLM model tag |
| `RISK_SERVICE_URL` | `core-service`, `agent-service` | `http://risk-service:8001` | Internal ML service URL |
| `AGENT_SERVICE_URL` | `core-service` | `http://agent-service:8002` | Internal AI service URL |
| `UPLOAD_DIR` | `core-service` | `/app/uploads` | Document storage volume mount |

