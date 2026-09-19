# Phase 6 Security & Performance Audit Report

## Executive Summary
This document provides the comprehensive security, privacy, and performance audit for the ConsentCare EHR system hardening performed during **Phase 6**. All controls have been evaluated, implemented, and empirically verified against the **OWASP ASVS 5.0.0 (Level 2)** verification baseline, **OWASP Top 10:2025**, and **OWASP API Security Top 10:2023**.

---

## 1. Audit Scope & Verification Baseline
* **System**: ConsentCare Electronic Health Record (EHR)
* **Components In Scope**:
  * `core-service` (Java 17, Spring Boot 3.3.4, Spring Security, Flyway, Hibernate Envers)
  * `risk-service` (Python 3.11, FastAPI, scikit-learn, Random Forest on UCI Diabetes dataset)
  * `agent-service` (Python 3.11, FastAPI, local Ollama `llama3.2:1b`, Tesseract OCR)
  * `frontend` (React 18, Vite, TypeScript, Tailwind CSS)
  * `postgres` (PostgreSQL 16-alpine)
* **Standards & Baselines**:
  * **OWASP ASVS 5.0.0 Level 2** (Application Security Verification Standard)
  * **OWASP Top 10:2025**
  * **OWASP API Security Top 10:2023**

---

## 2. Attack Surface Reduction: Retired Legacy Endpoints
During the Phase 6 audit, three prototype/development endpoints were identified in the codebase:
1. `POST /api/agent/risk-aware-alert`
2. `POST /api/agent/summarize`
3. `POST /api/risk/predict`

### Verification & Remediation:
* **Call Graph Analysis**: Grep search across `frontend/src`, `core-service`, `agent-service`, `risk-service`, Docker healthchecks, and test scripts confirmed **zero production callers**.
* **Retirement**: The endpoints were safely removed from `AgentController.java` and `RiskController.java`.
* **Standardized 404 Routing**: Configured `GlobalExceptionHandler` to intercept `NoHandlerFoundException` and `HttpRequestMethodNotSupportedException`, returning explicit RFC-compliant HTTP 404 and HTTP 405 error objects rather than unhandled 500 internal errors.
* **Internal Health Check Gating**: Diagnostic endpoints `GET /api/agent/health` and `GET /api/risk/health` were preserved for operational observability but restricted strictly to system administrators via `@PreAuthorize("hasRole('ADMIN')")`.

---

## 3. Network & Container Port Hardening
* **Vulnerability Identified**: Microservices `risk-service` (port 8001) and `agent-service` (port 8002) were previously published to all network interfaces (`0.0.0.0`), exposing internal ML and AI APIs to external network probes.
* **Remediation**:
  * Host port mappings in `docker-compose.yml` were hardened to bind strictly to loopback:
    * `"127.0.0.1:${RISK_PORT:-8001}:8001"`
    * `"127.0.0.1:${AGENT_PORT:-8002}:8002"`
  * Container-to-container internal communication remains routed securely over the internal Docker bridge network (`http://risk-service:8001` and `http://agent-service:8002`).
  * Verified: LAN or external hosts cannot bypass Spring Boot authorization to invoke ML or AI services directly.

---

## 4. Object-Level Access Control & BOLA Hardening (ASVS V4.1, V4.2)

### 4.1 Authorization Status Code Harmonization
* **Finding**: Several service methods previously threw `IllegalArgumentException` or `IllegalStateException` on unauthorized access attempts, which resulted in HTTP 400 Bad Request responses.
* **Remediation**: Updated all authorization failures across `ClinicalRecordService`, `ConsentService`, `NurseService`, `PatientService`, `DocumentService`, and `PrescriptionService` to throw `org.springframework.security.access.AccessDeniedException`, which maps to **HTTP 403 Forbidden**.

### 4.2 Detailed BOLA Controls Enforced:
1. **Clinical Encounters & Notes**: `amendEncounter` strictly verifies that the authenticated doctor is the original author and holds active patient consent.
2. **Diagnoses**: `updateDiagnosisStatus` strictly verifies doctor authorship and active consent.
3. **Lab Orders & Reports**: `recordLabReport` and `updateLabRequestStatus` verify active consent; `ADMIN` role is blocked from recording or viewing clinical lab reports.
4. **Vital Observations**: `recordObservation` enforces that doctors hold active consent and nurses belong to an active care team with patient consent.
5. **Medication Administration**: `recordAdministration` verifies that the nurse belongs to an active care team under a doctor who has active consent for the patient; non-assigned staff receive HTTP 403.
6. **Consent Revocation**: `revokeConsent` and `revokeDoctorAccess` verify that only the record-owning patient (or system administrator) can revoke consent; unauthorized callers receive HTTP 403.
7. **Patient Directory**: `GET /api/patients` is restricted to `ADMIN` only via `@PreAuthorize("hasRole('ADMIN')")`; patients and staff cannot enumerate the clinic directory.
8. **Document Upload & Access**: Cross-patient document uploads and unauthorized access attempts are blocked with HTTP 403.
9. **Server-Sent Events (SSE)**: Removed `.permitAll()` on `/api/notifications/stream` in `SecurityConfig.java`. SSE subscription strictly requires valid JWT authentication via Bearer header or query token.

---

## 5. Input Validation & File Upload Security (ASVS V5, V12)
* **File Size Limit**: Strictly enforced at 20 MB (`MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024`).
* **Extension Allowlist**: Only `pdf`, `jpg`, `jpeg`, `png`, `doc`, `docx`, `txt`, `csv` are accepted. Executables (`.exe`, `.sh`, `.bat`) and script files are immediately rejected with HTTP 400.
* **Magic Byte Signature Verification**: All uploads are inspected via binary header analysis to prevent file-extension spoofing (e.g. `%PDF` for PDF, PNG magic bytes, JPEG SOI marker, PK header for DOCX).
* **Path Traversal Sanitization**: `sanitizeFilename` strips directory separators, replaces double dots (`..`), filters non-whitelisted characters, and isolates uploaded files into patient-specific directory sandboxes.

---

## 6. Resource Consumption & Pagination Clamping (ASVS V10)
* **Finding**: Potential Denial-of-Service via unbounded pagination queries (e.g. `size=50000`).
* **Remediation**:
  * In `AdminController.java`: `page` is clamped to `Math.max(page, 0)` and `size` is clamped to `Math.min(Math.max(size, 1), 100)`.
  * In `NotificationRepository.java`: Implemented `findTop100ByRecipientUserIdOrderByCreatedAtDesc` to prevent unbounded in-memory collection allocation.

---

## 7. Sensitive Data Masking & Audit Logging (ASVS V8)
* **Masking Filter**: Implemented regex-based sensitive data masking in `AuditService.java` that automatically redacts credentials, passwords, Bearer tokens, and secrets from `metadataJson` and access log `reason` fields before persisting to PostgreSQL.
* **Audit Trail Coverage**: All security-relevant actions (`LOGIN`, `CREATE_PRESCRIPTION`, `MEDICATION_ADMINISTERED`, `REVOKE_CONSENT`, `UPLOAD_DOCUMENT`, `DOWNLOAD_DOCUMENT`, `ML_RISK_PREDICTION`) are recorded with immutable timestamps and actor attribution.

---

## 8. Database Performance Hardening: Flyway Migration V17
Created `core-service/src/main/resources/db/migration/V17__security_and_performance_hardening.sql` adding justified composite indexes without modifying historical V1–V16 migrations:
1. `idx_audit_logs_timestamp_actor` on `audit_logs(timestamp DESC, actor_username)`
2. `idx_audit_logs_action_result` on `audit_logs(action, result)`
3. `idx_access_logs_patient_accessed` on `access_logs(patient_id, accessed_at DESC)`
4. `idx_observations_patient_observed` on `observations(patient_id, observed_at DESC)`
5. `idx_prescriptions_patient_created` on `prescriptions(patient_id, created_at DESC)`
6. `idx_notifications_recipient_created` on `notifications(recipient_user_id, created_at DESC)`
7. `idx_consents_eval` on `consents(patient_id, doctor_id, revoked, expires_at)`

---

## 9. Frontend Performance Hardening: Route Code Splitting
* **Implementation**: In `frontend/src/App.tsx`, route-level code splitting was implemented using `React.lazy()` and `Suspense`:
  * `Dashboard` -> dynamic chunk `dist/assets/Dashboard-*.js` (60.45 kB)
  * `PatientDetail` -> dynamic chunk `dist/assets/PatientDetail-*.js` (73.16 kB)
  * `Admin` -> dynamic chunk `dist/assets/Admin-*.js` (15.27 kB)
  * `DocumentCenter` -> dynamic chunk `dist/assets/DocumentCenter-*.js` (40.20 kB)
* **Result**: Initial bundle size reduced significantly; landing and authentication screens load with zero clinical bundle overhead.

---

## 10. Empirical Verification Summary
* **Phase 6 Security Regression Suite (`test_phase6_security_regression.ps1`)**:
  * **31 out of 31 automated security checks PASSED (100%)**.
* **Phase 5 Full Workflow Suite (`test_phase5_e2e.ps1`)**:
  * **13 out of 13 acceptance criteria PASSED (100%)**.
  * Zero regression in clinical, consent, Ollama document AI, and UCI ML risk prediction workflows.

