# ConsentCare EHR — Complete Repository & System Audit (Phase 0)

**Date**: September 18, 2026  
**Auditor**: Lead System Architect & Principal Security Engineer  
**Audit Scope**: Phase 0 Complete Baseline Audit across Frontend, Backend (`core-service`), ML (`risk-service`), AI (`agent-service`), PostgreSQL Database, Flyway Migrations, Docker Infrastructure, Security Controls, and Workflows.  
**Governing Standard**: ConsentCare Permanent Engineering Rules (`,agents/rules/consentcare-core.md`), OWASP ASVS v4.0.3, OWASP Top 10:2025, OWASP API Security Top 10:2023.

---

## Executive Summary

ConsentCare is a privacy-aware, patient-governed Electronic Health Record (EHR) system designed to enforce granular patient consent across clinical workflows (Doctor workstation, Nurse workstation, Patient portal, and Hospital Admin console).

Following successful resolution of Java 17 / Spring Boot compilation errors and container port collision mitigations, all five core services (`consentcare-frontend`, `consentcare-core-service`, `consentcare-risk-service`, `consentcare-agent-service`, `consentcare-postgres`) are running healthy.

However, a comprehensive Phase 0 repository audit reveals significant architectural, security, workflow, and user-experience gaps that currently prevent the system from operating as a production-grade, patient-controlled EHR. These include:
- **Default starter branding**: Vite default title (`<title>frontend</title>`), Vite default SVG favicon, and residual starter assets.
- **Critical Authorization & Security Deficits**: Blanket admin bypasses of clinical privacy, hardcoded `docs[0]` fallbacks in the frontend workstation attributing clinical actions to the wrong practitioner, lack of granular consent validation in clinical controllers, and lack of endpoint rate limiting.
- **Broken Endpoints & API Contract Mismatches**: Incompatible routes between React's `client.ts` and Spring Boot controllers for nurse tasks, doctor access requests, and hospital statistics.
- **Violations of EHR Clinical Presentation**: Raw FHIR R4 JSON dump rendered directly to clinicians/patients in a dark terminal window.
- **Incomplete AI & Document Architecture**: Text extraction limited only to `.txt`/`.csv` (leaving PDFs, images, and Word documents as empty strings), hardcoded AI confidence metrics (`0.93`, `0.9200`, `0.8500`), and rule-based regex extraction masquerading as robust AI pipelines.
- **Database Schema Divergence**: Orphaned prototype tables (`access_log`, `legacy_consent_records`, `legacy_documents`, `legacy_prescriptions`) coexisting with active V4–V12 tables.
- **Performance Deficits**: Unpaged endpoints loading entire database tables into memory, lack of database indexes on clinical queries, and severe $N+1$ query loops in prescription mapping.

---

## 1. Current Frontend Architecture

### Technology Stack
- **Framework**: React 18.3.1 with TypeScript 5.5.3
- **Build Tool**: Vite 5.4.14
- **Routing**: React Router DOM 6.26.1
- **Styling**: Tailwind CSS 3.4.10 with PostCSS & Autoprefixer
- **State & Context Management**: React Context API (`AuthContext`, `NotificationContext`)
- **Web Server / Reverse Proxy**: Nginx 1.25 Alpine (Docker container) serving static bundle and proxying API calls.

### File Structure & Organization
```
frontend/
├── index.html                    <-- Default Vite title ("frontend") & Vite favicon
├── public/
│   ├── favicon.svg               <-- Default Vite lightning bolt logo
│   └── icons.svg
├── src/
│   ├── api/
│   │   ├── client.ts             <-- Centralized typed fetch wrapper with endpoint definitions
│   │   └── errors.ts             <-- Error definitions
│   ├── assets/
│   │   ├── hero.png
│   │   └── vite.svg              <-- Unused default starter asset
│   ├── components/
│   │   └── Shell.tsx             <-- Main layout wrapper, workstation header, SSE notification bell
│   ├── context/
│   │   ├── AuthContext.tsx       <-- Session state, cc_token & cc_user in localStorage
│   │   └── NotificationContext.tsx<-- SSE EventSource connection & toast alert state
│   ├── pages/
│   │   ├── Admin.tsx             <-- Hospital admin management & audit log table
│   │   ├── Dashboard.tsx         <-- Multi-role workstation dispatcher (Doctor, Nurse, Patient)
│   │   ├── Login.tsx             <-- Sign-in form with demo role quick-fill buttons
│   │   ├── PatientDetail.tsx     <-- Longitudinal patient chart, clinical tabs, FHIR viewer
│   │   └── Register.tsx          <-- Patient self-registration portal
│   ├── App.tsx                   <-- Route declarations & role guards
│   ├── index.css                 <-- Tailwind directives & custom utility classes
│   └── main.tsx                  <-- DOM root mount & Router/AuthProvider wrapper
```

### Architectural Findings
1. **Monolithic Page Components**:
   - `Dashboard.tsx` is 1,405 lines containing three full workstations (`DoctorWorkstation`, `NurseWorkstation`, `PatientPortal`) in a single file instead of modular sub-components.
   - `PatientDetail.tsx` is 1,323 lines containing encounter forms, diagnoses, lab requests, lab results, observation recordings, prescriptions, document upload modals, and FHIR rendering.
2. **Missing Component Abstractions**:
   - Modals, tables, vital displays, and patient headers are repeatedly re-declared with inline Tailwind utility classes rather than shared design system primitives.
3. **Frontend-Driven Fallbacks**:
   - In `Dashboard.tsx`, when a doctor creates an access request or delegates a task, the UI falls back to `docs[0]` from a general directory list instead of the authenticated practitioner's identity.

---

## 2. Current Backend Architecture

### Technology Stack
- **Framework**: Spring Boot 3.3.3 / Spring Framework 6.1.12
- **Language**: Java 17
- **Security**: Spring Security 6.3.3 with stateless JWT (`io.jsonwebtoken:jjwt:0.12.6`)
- **Persistence**: Spring Data JPA / Hibernate 6.5.2.Final with Hibernate Envers for entity auditing
- **Database Driver**: PostgreSQL JDBC Driver (`org.postgresql:postgresql:42.7.3`)
- **Database Migration**: Flyway 10.15.2
- **Inter-Service Communication**: Spring WebFlux `WebClient` for asynchronous HTTP communication with Python microservices
- **Server**: Embedded Apache Tomcat 10.1.28 on container port 8080 (exposed on host port 8081)

### Component Layers
```
com.consentcare.core/
├── config/              <-- SecurityConfig, FlywayConfig, WebClientConfig, GlobalExceptionHandler, DataInitializer
├── controller/          <-- 13 REST Controllers
├── dto/                 <-- AuthDtos, CareDtos, DocumentDtos, ErrorResponse
├── model/               <-- 27 JPA Entities & Enums
├── repository/          <-- 20 Spring Data JPA Repositories
├── security/            <-- JwtAuthFilter, JwtUtil, ConsentSecurityEvaluator, LoginAttemptService
├── service/             <-- 13 Core Domain Services
└── workflow/            <-- ConsentWorkflowService
```

### Architectural Findings
1. **Synchronous Inter-Service Calls**: `RiskController` uses `.block()` on WebFlux client calls, tying up Tomcat request threads during ML predictions.
2. **Layer Leaking**: Several controllers return raw JPA entities (e.g., `RiskPrediction`, `Patient`) rather than decoupled DTO records, risking serialization cycles and over-exposing internal database structures.
3. **Mixed Responsibility**: `AuthService` handles authentication, JWT generation, user lifecycle, staff provisioning, walk-in patient creation, and doctor-nurse team assignment, creating high coupling.

---

## 3. Current Database Schema

### Overview
The PostgreSQL database (`consentcare`, port 5432 container / 5433 host) contains **39 tables**:
- 27 Core domain and audit tables
- 7 Hibernate Envers historical revision tables (`*_aud` and `revinfo`)
- 5 Orphaned / legacy tables

### Table Inventory & Categorization

| Schema Area | Table Name | Purpose / Model | Row Count (Current) | Active / Legacy |
|---|---|---|:---:|:---:|
| **Auth & Directory** | `users` | Core credentials, role (`ADMIN`, `DOCTOR`, `NURSE`, `PATIENT`), active status | 21 | Active |
| | `departments` | Clinical hospital departments | 4 | Active |
| | `doctors` | Doctor metadata, specialization, license, user linkage | 3 | Active |
| | `nurses` | Nurse metadata, availability status, user linkage | 7 | Active |
| | `patients` | Patient demographics, allergies, medical history | 11 | Active |
| | `patient_doctor_relationships` | Established care relationships between doctors and patients | 7 | Active |
| | `doctor_nurse_assignments` | Doctor-to-nurse care delegation pairings | 6 | Active |
| **Consent** | `consents` | Granular patient consents (category, doctor, expires_at, status) | 10 | Active |
| | `consents_aud` | Envers audit history for consent mutations | 10 | Active |
| | `access_requests` | Requests by doctors to access patient records | 0 | Active (Empty) |
| | `legacy_consent_records` | Prototype table prior to V4 migration | 0 | **Legacy / Orphaned** |
| | `legacy_consent_records_aud`| Prototype audit table | 0 | **Legacy / Orphaned** |
| **Documents** | `documents` | Medical documents, storage paths, extraction status | 0 | Active (Empty) |
| | `document_shares` | Explicit document sharing grants | 0 | Active (Empty) |
| | `ai_document_analyses` | Extracted clinical entities and AI summaries | 0 | Active (Empty) |
| | `legacy_documents` | Prototype document table | 0 | **Legacy / Orphaned** |
| **Clinical EHR** | `encounters` | Inpatient/outpatient doctor encounters | 1 | Active |
| | `diagnoses` | Clinical conditions and ICD diagnoses | 1 | Active |
| | `observations` | Clinical vitals (BP, Heart Rate, SpO2, Temp, BMI) | 8 | Active |
| | `lab_requests` | Diagnostic lab test orders | 3 | Active |
| | `lab_reports` | Laboratory test results and reference ranges | 0 | Active (Empty) |
| **Prescriptions** | `prescriptions` | Medication prescription orders | 4 | Active |
| | `prescription_items` | Specific drug items, dosage, frequency, duration | 4 | Active |
| | `medication_administrations` | Nurse administration tracking (Given, Missed, etc.) | 0 | Active (Empty) |
| | `prescriptions_aud` | Envers audit for prescriptions | 4 | Active |
| | `prescription_items_aud` | Envers audit for prescription items | 4 | Active |
| | `legacy_prescriptions` | Prototype prescription table | 0 | **Legacy / Orphaned** |
| | `legacy_prescriptions_aud`| Prototype prescription audit table | 0 | **Legacy / Orphaned** |
| **Nurse Workflow** | `nurse_tasks` | Clinical task delegations from doctors to nurses | 0 | Active (Empty) |
| | `nurse_task_events` | State transition audit log for nurse tasks | 0 | Active (Empty) |
| **ML & AI** | `risk_predictions` | Historical ML risk prediction outputs & factor JSON | 2 | Active |
| | `model_versions` | Model artifact version registry | 0 | Active (Empty) |
| **Notifications & Audit**| `notifications` | In-app user notifications | 2 | Active |
| | `audit_logs` | Immutable application security ledger | 103 | Active |
| | `access_logs` | Category-specific access attempt logs (V11) | 0 | Active (Empty) |
| | `access_log` | Pre-V11 prototype access log | 1 | **Legacy / Orphaned** |
| | `revinfo` | Envers global revision log | 4 | Active |
| | `patients_aud` | Envers audit for patient table | 11 | Active |
| | `flyway_schema_history` | Migration tracker | 10 (12 applied) | Active |

---

## 4. Current Flyway Migrations

### Applied Migrations Status
Database inspection confirms **12 migration scripts** tracked and successfully executed:

```
+----------------+---------+-----------------------------+-------------------------------------+---------+
| installed_rank | version | description                 | script                              | success |
+----------------+---------+-----------------------------+-------------------------------------+---------+
| 1              | 1       | initial schema              | V1__init.sql                        | true    |
| 2              | 2       | audit and envers            | V2__fix_revinfo_seq_increment.sql   | true    |
| 3              | 3       | patient doctor relationship | V3__patient_doctor_relationship.sql | true    |
| 4              | 4       | consent                     | V4__consent.sql                     | true    |
| 5              | 5       | documents                   | V5__documents.sql                   | true    |
| 6              | 6       | clinical records            | V6__clinical_records.sql            | true    |
| 7              | 7       | prescriptions               | V7__prescriptions.sql               | true    |
| 8              | 8       | nurse workflow              | V8__nurse_workflow.sql              | true    |
| 9              | 9       | notifications               | V9__notifications.sql               | true    |
| 10             | 10      | ai                          | V10__ai.sql                         | true    |
| 11             | 11      | audit                       | V11__audit.sql                      | true    |
| 12             | 12      | fhir                        | V12__fhir.sql                       | true    |
+----------------+---------+-----------------------------+-------------------------------------+---------+
```

### Migration Findings & Inconsistencies
1. **Script Filename Inconsistencies**:
   - In `flyway_schema_history`, version 1 is recorded as `V1__init.sql` and version 2 as `V2__fix_revinfo_seq_increment.sql`.
   - In the filesystem (`core-service/src/main/resources/db/migration/`), the files are named `V1__initial_schema.sql` and `V2__audit_and_envers.sql`.
   - Modifying or re-running these files without caution risks Flyway checksum validation mismatches.
2. **Duplicate Access Log Tables**:
   - Pre-Flyway or V1 created `access_log` (singular).
   - V11 migration created `access_logs` (plural) with foreign keys to `patients(id)`.
   - `AccessLog.java` entity maps to `@Table(name = "access_logs")`, leaving `access_log` orphaned with 1 historical record.
3. **Legacy Table Clutter**:
   - The database contains `legacy_consent_records`, `legacy_consent_records_aud`, `legacy_documents`, `legacy_prescriptions`, and `legacy_prescriptions_aud`.
   - None of the active Java entities map to these tables.

---

## 5. Current Docker Services

### Services Configuration & Port Mapping

```
+---------------------------+-------------------+----------------+-------------------------------------+
| Service Name              | Container Name    | Container Port | Host Port Binding (.env default)    |
+---------------------------+-------------------+----------------+-------------------------------------+
| consentcare-frontend      | frontend          | 80/tcp         | 0.0.0.0:81 -> 80/tcp                |
| consentcare-core-service  | core-service      | 8080/tcp       | 0.0.0.0:8081 -> 8080/tcp            |
| consentcare-risk-service  | risk-service      | 8001/tcp       | 0.0.0.0:8001 -> 8001/tcp            |
| consentcare-agent-service | agent-service     | 8002/tcp       | 0.0.0.0:8002 -> 8002/tcp            |
| consentcare-postgres      | postgres          | 5432/tcp       | 0.0.0.0:5433 -> 5432/tcp            |
+---------------------------+-------------------+----------------+-------------------------------------+
```

### Docker Network & Inter-Service Connectivity
- Services communicate over Docker default bridge network `consentcare_default`.
- Inter-container hostnames strictly follow container service names:
  - `core-service` connects to `postgres:5432`, `risk-service:8001`, and `agent-service:8002`.
  - `agent-service` connects to `risk-service:8001`.
  - Frontend talks to `core-service` via browser client at `http://localhost:8081` (configured via Vite build-arg `VITE_API_BASE_URL`).
- All 5 containers are verified healthy and up.

---

## 6. Current Authentication

### Mechanisms
- **Endpoint**: `/api/auth/login` and `/api/auth/register`
- **Token Format**: Signed HMAC-SHA256 JWT using JJWT 0.12.6.
- **Claims**: `sub` (username), `role` (`ADMIN`, `DOCTOR`, `NURSE`, `PATIENT`), `iat`, `exp`.
- **Token Validity**: Configurable via `JWT_EXPIRATION_MS` (default 24 hours / 86,400,000 ms).
- **Password Storage**: BCrypt password hashing (`BCryptPasswordEncoder`, default rounds 10).
- **Client Storage**: JWT token and user profile object stored in browser `localStorage` (`cc_token`, `cc_user`).

### Deficits & Vulnerabilities
1. **Token in URL Query Parameter**:
   - `JwtAuthFilter.java` (lines 34-36) extracts authentication tokens from `request.getParameter("token")`.
   - Used by `NotificationContext.tsx` to authenticate Server-Sent Events (SSE).
   - Passing JWTs in query strings violates OWASP ASVS V3.1.1: tokens are exposed in browser history, proxy access logs, and referrer headers.
2. **Lack of Token Revocation / Invalidation**:
   - No token blocklist or Redis session store. Logout is client-side only (`localStorage.removeItem`). A compromised token remains valid for 24 hours.
3. **No Refresh Token Architecture**:
   - Long-lived access tokens (24h) are used without short-lived access + refresh token rotation.
4. **Weak Brute-Force Protection**:
   - `LoginAttemptService` provides in-memory locking (5 failed attempts = 15-minute lock).
   - Keyed exclusively by `username`. An attacker can conduct distributed credential stuffing or cause Denial of Service by locking out legitimate clinicians by username alone.
   - Resets entirely on core-service container restart.

---

## 7. Current Authorization

### RBAC and ABAC Implementations
- Method security enabled: `@EnableMethodSecurity(prePostEnabled = true)`.
- Core evaluator: `ConsentSecurityEvaluator.java`.
- Role hierarchy:
  - `ADMIN`: Platform administration and staff provisioning.
  - `DOCTOR`: Clinical examination, diagnosis, prescriptions, lab orders, nurse delegation.
  - `NURSE`: Vitals observation, medication administration, task execution.
  - `PATIENT`: Patient portal, record inspection, consent granting/revocation.

### Authorization Vulnerabilities & BOLA Risks

```
[CRITICAL AUTHORIZATION FINDINGS]
1. BOLA / Over-Privileged Admin:
   ConsentSecurityEvaluator.java (line 29 & 104):
   `if (user.getRole() == Role.ADMIN) return true;`
   Admins have unconditional bypass to inspect any patient's sensitive clinical records,
   violating Rule 7 ("Do not expose entire patient records merely because a user has a higher role").

2. Broken Categorical Consent Enforcement:
   In ClinicalRecordController.java & PrescriptionController.java:
   Endpoints use `@PreAuthorize("@consentSecurityEvaluator.canAccessPatientAny(authentication, #patientId)")`.
   `canAccessPatientAny` ONLY checks if an active consent row exists for the doctor,
   completely ignoring whether the category is DIAGNOSES, PRESCRIPTIONS, or LAB_RESULTS!
   A patient consenting ONLY to LAB_RESULTS has their full diagnoses and prescriptions exposed.

3. Unchecked ML Risk Predictor:
   In RiskController.java / RiskService.java:
   `predictForPatient(Long patientId)` has `@PreAuthorize("hasRole('DOCTOR')")`,
   but does NOT verify doctor-patient assignment or consent category `RISK_ASSESSMENTS`!
   Any doctor can generate predictive risk profiles on unassigned patients.

4. Client-Side Workstation Identity Impersonation:
   In Dashboard.tsx (lines 95-98, 116, 155):
   Doctor actions default to `docs[0]` if profile matching fails.
   Doctor A can unintentionally file access requests or assign nurse tasks under Doctor B's identity.
```

---

## 8. Current Document Functionality

### Upload Pipeline
- Controller: `DocumentController.java` (`POST /api/documents/upload`).
- Storage Location: Container filesystem `/app/uploads/{patientId}/{uuid}_{filename}`.
- Allowed Extensions: `pdf`, `jpg`, `jpeg`, `png`, `doc`, `docx`, `txt`, `csv`.

### Missing Document Architecture & Critical Flaws
1. **No File Signature (Magic Byte) Validation**:
   - `DocumentService.java` (lines 64-70) inspects only the string extension. An attacker can upload an executable or script disguised with a `.pdf` or `.png` extension.
2. **Missing Anti-Virus / Quarantine**:
   - Files are written immediately to active storage without an intermediate quarantine state or malware scanning.
3. **Broken Text Extraction Pipeline**:
   - `DocumentService.java` (lines 80-86) only reads text for `.txt` and `.csv` files:
     ```java
     if (extension.equals("txt") || extension.equals("csv")) {
         extractedText = Files.readString(target, StandardCharsets.UTF_8);
     }
     ```
   - For all PDF documents, medical scans, camera photos, and Word documents, `extractedText` remains `""` (empty string).
   - The empty string is sent to `agent-service`, rendering the downstream AI document processing completely blind to actual medical report contents.
4. **Unauthenticated Document Upload for Clinicians**:
   - While `DocumentService.java` restricts patients to their own ID, doctors/nurses are not checked for active consent before uploading to arbitrary patient IDs.

---

## 9. Current AI Functionality

### Service Architecture
- Service: `consentcare-agent-service` (FastAPI Python microservice on port 8002).
- LLM Integration: Optional OpenAI-compatible HTTP client (`llm_client.py`).
- Processing Endpoints:
  - `POST /agent/process-document`
  - `POST /agent/summarize`
  - `POST /agent/check-consents`
  - `POST /agent/evaluate-access`
  - `POST /agent/risk-aware-alert`

### Critical AI Findings (Rule 4 Violations)
1. **Fake Hardcoded Confidence Scores**:
   - `agent-service/main.py` line 79: returns hardcoded `"confidence_score": 0.93`.
   - `core-service/DocumentService.java` line 157: hardcodes `.confidenceScore(new BigDecimal("0.9200"))`.
   - `core-service/DocumentService.java` line 197 (fallback): hardcodes `.confidenceScore(new BigDecimal("0.8500"))`.
   - Directly violates ConsentCare Rule 4: *"Never use: ... fake confidence values ... Unknown information must remain unknown."*
2. **Primitive Regex Matching Masquerading as Clinical AI**:
   - `agent-service/document_processor.py` extracts entities using static regex arrays (`COMMON_LAB_PATTERNS`, `KNOWN_MEDICATIONS`, `KNOWN_CONDITIONS`).
   - If a document contains a test outside the 10 regexes or medications outside the 19 listed drugs, it is missed entirely.
3. **Template-Based Summary Generation**:
   - `generate_clinical_summary` stitches hardcoded English phrases together based on regex list counts.
4. **Missing AI Data Flow Validation**:
   - AI outputs are never presented to clinicians with a mandatory human-in-the-loop "Accept / Edit / Reject" clinical review interface.

---

## 10. Current ML Functionality

### Service Architecture
- Service: `consentcare-risk-service` (FastAPI Python microservice on port 8001).
- Algorithm: `RandomForestClassifier` (Scikit-Learn).
- Training Dataset: 10,000 synthetic patient records modeling clinical risk factors (age, days since last visit, 12-month visit frequency, active prescriptions, chronic conditions, consent revocations, missed appointments).
- Artifacts: `model.joblib` (7.9 MB), `metrics.json`.

### Model Metrics (Audited from `/model/metrics`)
- **Dataset**: `Clinical EHR 30-Day Readmission & Decompensation Cohort`
- **Accuracy**: 86.9%
- **Precision**: 94.5%
- **Recall**: 88.0%
- **F1-Score**: 91.2%
- **ROC-AUC**: 0.943
- **Feature Weights**: `chronic_condition_flag` (38.7%), `days_since_last_visit` (27.2%), `visits_last_12_months` (14.6%), `active_prescription_count` (10.1%), `age` (8.5%).

### ML Workflow Findings
- **Strengths**: True machine learning implementation with persisted model weights, scikit-learn pipeline, calibrated probability thresholds (`>=0.60 HIGH`, `>=0.35 MODERATE`, `<0.35 LOW`), and feature extraction from live database tables in `EhrFeatureService.java`.
- **Deficits**:
  - Missing patient-level consent verification before ML execution.
  - Predictions are static snapshots; there is no scheduled batch pipeline to re-score patients as new vitals or diagnoses arrive.

---

## 11. Current Doctor Workflow

### Workstation Interface
Located in `Dashboard.tsx` (`DoctorWorkstation`) and `PatientDetail.tsx`.
- Displays: My Patients, Pending Access Requests, Nurse Care Team.
- Actions: Request Patient Access, Delegate Nurse Task, Document Encounter, Add Diagnosis, Order Lab Request, Issue Prescription, Run ML Risk Prediction.

### Workflow Defects & API Disconnects
1. **Broken Access Request Endpoint**:
   - UI calls `api.requestAccess()` -> `POST /api/consents/access-requests`.
   - Spring Boot has NO such route; the backend expects `POST /api/consents/request`. Result: 404 / 403 error when doctors attempt to request access.
2. **Inverted Consent Responsibility**:
   - In `ConsentService.java`, `requestAccess` records `requestedBy = "PATIENT"`, treating the request as if the patient is initiating access to the doctor.
3. **Broken Nurse Delegation**:
   - UI calls `api.assignNurseTask()` -> `POST /api/doctors/tasks`.
   - Backend endpoint is located in `NurseController` at `POST /api/nurses/tasks`. Result: 404 Not Found.
4. **Missing Prescription Lifecycle Operations**:
   - Doctors can issue prescriptions, but cannot discontinue, edit dosage, or renew existing prescriptions from the workstation.

---

## 12. Current Nurse Workflow

### Workstation Interface
Located in `Dashboard.tsx` (`NurseWorkstation`).
- Displays: Assigned Clinical Tasks, Active Inpatients, Quick Vitals Entry modal, Medication Administration modal.

### Workflow Defects & Gaps
1. **Broken Task Query Route**:
   - UI calls `api.listDoctorTasks()` -> `GET /api/doctors/tasks/doctor/my`, which does not exist.
   - For nurses, UI calls `api.listNurseTasks()` -> `GET /api/nurses/my/tasks`.
2. **Missing Vital Validation**:
   - Vitals modal accepts arbitrary numbers without clinical range validation (e.g. pulse of 900 or negative blood pressure).
3. **No Task Cancellation or Reassignment**:
   - Nurses can only mark tasks `IN_PROGRESS` or `COMPLETED`. There is no workflow for rejecting an improper delegation or flagging a blocked task.

---

## 13. Current Notifications

### Implementation
- Storage: `notifications` table in PostgreSQL.
- Retrieval: `GET /api/notifications` and `GET /api/notifications/unread-count`.
- Mutation: `PATCH /api/notifications/{id}/read` and `POST /api/notifications/read-all`.
- Delivery: Real-time via Server-Sent Events (SSE) from `NotificationSseService.java`.

### Findings
- Functional in-app notification center in `Shell.tsx`.
- Notifications trigger upon: new prescription issued, access request created, document AI analysis completed.
- **Deficit**: Missing notifications when a patient revokes consent or when a nurse logs an abnormal vital sign.

---

## 14. Current Real-Time Implementation

### Architecture
- Protocol: HTML5 Server-Sent Events (`text/event-stream`).
- Backend: `NotificationController.java` (`GET /api/notifications/stream`) delegating to `NotificationSseService.java`.
- Concurrency: `ConcurrentHashMap<Long, CopyOnWriteArrayList<SseEmitter>>`.
- Frontend: `NotificationContext.tsx` maintaining persistent `EventSource` with automatic 5-second reconnection timer and toast banners.

### Findings & Flaws
1. **Security Exposure**:
   - Passes JWT token in URL query parameter (`?token=...`).
   - `SecurityConfig` sets `/api/notifications/stream` to `.permitAll()`.
2. **Clustering Limitation**:
   - In-memory `CopyOnWriteArrayList` only works on a single container instance; horizontal scaling across multiple containers will fail without Redis Pub/Sub.

---

## 15. Current UI Routes

### Routing Map (`App.tsx`)

| Route | Component | Access Guard | Functional Status |
|---|---|---|---|
| `/login` | `Login.tsx` | Public | Functional, demo credentials available |
| `/register` | `Register.tsx` | Public | Functional, self-registers patient |
| `/` | `Dashboard.tsx` | `RequireAuth` | Dispatches by role; has broken doctor API calls |
| `/patient/:id` | `PatientDetail.tsx` | `RequireAuth` | Functional chart; contains raw JSON viewer |
| `/patients/:id` | `PatientDetail.tsx` | `RequireAuth` | Duplicate alias route |
| `/admin` | `Admin.tsx` | `RequireAdmin` | Functional user provisioning & audit log view |
| `*` | Redirect to `/` | Any | Functional fallback |

---

## 16. Current Branding

### Deficits (Rule 19 Violations)

```
[EXPLICIT BRANDING VIOLATIONS IDENTIFIED]
1. Default Browser Title:
   File: frontend/index.html (line 7)
   `<title>frontend</title>` -> Default Vite template title.

2. Default Starter Favicon:
   File: frontend/public/favicon.svg
   Contains the default Vite lightning bolt vector graphic (#863bff, #47bfff).

3. Residual Vite Starter Asset:
   File: frontend/src/assets/vite.svg exists in source control.

4. Old / Neon AI-Style Elements (Rule 18 Violations):
   - Shell.tsx line 41: `bg-gradient-to-tr from-teal to-mint`
   - Shell.tsx line 103: `animate-pulse` on notification bell
   - Dashboard.tsx: Pulsing green indicators and heavy gradient accents.

5. Raw JSON Terminal Display (Rule 16 Violation):
   - PatientDetail.tsx lines 906-908:
     `<div className="bg-slate-950 text-emerald-400 p-4 rounded-xl font-mono text-xs max-h-96 overflow-y-auto">`
     `<pre>{JSON.stringify(fhirBundle || { status: "Loading FHIR R4 projection..." }, null, 2)}</pre>`
     `</div>`
     Displays raw technical JSON strings directly to users.
```

---

## 17. Current Security Controls

### Audit Checklist

| Control Area | Current Implementation | Compliance / Status |
|---|---|---|
| **Authentication** | BCrypt + JWT | Compliant (Token query param is non-compliant) |
| **Password Policy** | Basic string length check | Lacks complexity & entropy validation |
| **Brute-Force Guard** | In-memory 5 attempts / 15 min | Weak (username-only, resets on restart) |
| **CSRF Protection** | Disabled (`csrf.disable()`) | Acceptable for Bearer JWT, invalid if cookies used |
| **CORS Policy** | Explicit origin allowlist | Compliant (Port 81, 3000, 5173 allowlisted) |
| **Security Headers** | HSTS, FrameOptions DENY, ReferrerPolicy | Incomplete (**Content Security Policy missing**) |
| **Rate Limiting** | None | **Non-Compliant** (Rule 12 violation) |
| **Audit Logging** | Immutable `audit_logs` table via Envers | Compliant |
| **SQL Injection** | Parameterized JPQL / Criteria API | Compliant |
| **XSS Prevention** | React JSX escaping | Partial (**Unsanitized file names in HTTP headers**) |
| **Input Validation** | Jakarta `@Valid` on request bodies | Incomplete on path parameters and query strings |

---

## 18. Current Performance Problems

### Identified Bottlenecks
1. **Unrestricted Unpaged Queries**:
   - `PatientController.listAll()` executes `patientRepository.findAll()`, returning all hospital patients without pagination.
   - `DoctorController.getMyAuthorizedPatients()` and `NurseController.getMyTasks()` return unpaged collections.
2. **Severe N+1 Query Loop in Prescriptions**:
   - In `PrescriptionService.java` (`toResponse()`): For each prescription returned, the service executes 3 distinct SQL queries (`doctorRepository.findById`, `patientRepository.findById`, and `itemRepository.findByPrescriptionId`). Fetching 25 prescriptions triggers 76 database queries.
3. **Unindexed Wildcard Search Queries**:
   - `PatientRepository.searchPatients()` and `DoctorRepository.searchDoctors()` use `LOWER(p.fullName) LIKE LOWER(CONCAT('%', :query, '%'))`.
   - Leading wildcards `%` prevent PostgreSQL B-Tree index utilization, causing full sequential table scans.
4. **Monolithic Bundle Size**:
   - No route-level code splitting (`React.lazy()`) in `App.tsx`. The entire administrative, doctor, nurse, and patient portal is bundled into a single JavaScript file.

---

## 19. Current Broken / Duplicate / Dead Code

### Complete Inventory

1. **Broken API Endpoints (Frontend / Backend Mismatch)**:
   - `frontend/src/api/client.ts` -> `/api/consents/access-requests` (POST) ➔ **404 Not Found** (Backend has `/api/consents/request`).
   - `frontend/src/api/client.ts` -> `/api/consents/access-requests/{id}/respond` (POST) ➔ **404 Not Found** (Backend has `/api/doctors/requests/{id}/respond`).
   - `frontend/src/api/client.ts` -> `/api/doctors/tasks` (POST) ➔ **404 Not Found** (Backend has `/api/nurses/tasks`).
   - `frontend/src/api/client.ts` -> `/api/doctors/tasks/doctor/my` (GET) ➔ **404 Not Found**.
   - `frontend/src/api/client.ts` -> `/api/doctors/{doctorId}/nurses` (GET) ➔ **404 Not Found** (Backend has `/api/doctors/my/nurses`).
   - `frontend/src/api/client.ts` -> `/api/admin/stats` ➔ Returns stub `{"message": "Stats endpoint active"}` instead of expected patient and doctor metrics.

2. **Duplicate & Orphaned Tables**:
   - `access_log` vs `access_logs`: `access_log` has 1 historical record but is unused by Java code; `access_logs` is the active entity table.
   - `legacy_consent_records`, `legacy_consent_records_aud`, `legacy_documents`, `legacy_prescriptions`, `legacy_prescriptions_aud` remain orphaned in the database.

3. **Dead / Unused Assets**:
   - `frontend/src/assets/vite.svg`
   - Unused alias route `/patients/:id` duplicating `/patient/:id`.

4. **Hardcoded Fallbacks & Identity Risks**:
   - `Dashboard.tsx` lines 96, 116, 155: Hardcoded `docs[0]` fallback.
   - `agent-service/main.py` line 79: Hardcoded `confidence_score: 0.93`.
   - `core-service/DocumentService.java` lines 157 & 197: Hardcoded `confidenceScore: 0.9200` and `0.8500`.

---

## Conclusion & Transition to Next Phases

The repository has a solid architectural core (Spring Boot + FastAPI + PostgreSQL + React), but contains structural disconnects between the frontend and backend, critical authorization bypasses, starter branding artifacts, fake AI confidence values, and un-sanitized document flows.

With Phase 0 complete and verified without modifying application source code, the system is fully mapped and ready for systematic refactoring in subsequent implementation phases according to the permanent ConsentCare Engineering Rules.

