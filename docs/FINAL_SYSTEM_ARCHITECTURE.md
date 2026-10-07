# ConsentCare EHR — Final System Architecture

> **Document Classification**: System Architectural Specification  
> **Status**: APPROVED & VERIFIED (Phase 8 Baseline)  
> **Baseline Version**: v1.0-research-demo  
> **Target Environment**: Docker Compose (Development & Hardened Production Tiers)

---

## 1. Executive Architectural Summary

ConsentCare EHR is a patient-governed, zero-trust Electronic Health Record platform designed to enforce patient sovereignty over clinical data access while enabling collaborative medical workflows across multidisciplinary care teams.

The system is structured as a multi-tier, modular micro-service architecture separating user interface presentation, clinical core business logic, relational storage, grounded local document intelligence, and supervised machine learning risk prediction.

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
|           Web Browser (Desktop / Tablet / Mobile Responsive Breakpoints)          |
+-----------------------------------------------------------------------------------+
                                         |
                                         | HTTP / HTTPS (Port 81/443)
                                         v
+-----------------------------------------------------------------------------------+
|                               DMZ / EDGE TIER                                     |
|  +-----------------------------------------------------------------------------+  |
|  | Nginx Web Server (consentcare-frontend:80)                                  |  |
|  | - Serves React 18 SPA (Vite, Code-Split Chunks, Content-Security-Policy)    |  |
|  | - Security Headers: X-Frame-Options, X-Content-Type-Options, CSP, HSTS     |  |
|  +-----------------------------------------------------------------------------+  |
|                                        |                                          |
|                                        | Reverse Proxy `/api/*`                   |
|                                        v                                          |
|  +-----------------------------------------------------------------------------+  |
|  | Spring Boot Core Gateway (consentcare-core-service:8080)                    |  |
|  | - Port published: 8081 (Dev) / Internal Nginx upstream (Prod)               |  |
|  | - Spring Security 6 Filter Chain & JWT Stateless Authentication             |  |
|  | - ABAC ConsentSecurityEvaluator & RBAC Method Security                      |  |
|  | - Bucket4j Rate Limiting Filter (OWASP API4:2023 mitigation)                |  |
|  | - Server-Sent Events (SSE) Emitter Registry                                 |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
             |                                 |                        |
             | JDBC (Pool)                     | HTTP (Internal Loop)   | HTTP (Internal)
             v                                 v                        v
+------------------------+  +----------------------+  +-----------------------------+
|    PERSISTENCE TIER    |  |       ML TIER        |  |          AI TIER            |
| PostgreSQL 16          |  | Risk Microservice    |  | Agent Microservice          |
| (consentcare-postgres) |  | (Python 3.11/FastAPI)|  | (Python 3.11/FastAPI)       |
| - Flyway V1-V17        |  | - Port 8001 (Loop)   |  | - Port 8002 (Loop)          |
| - Relational Schema    |  | - Scikit-Learn RF    |  | - Tesseract OCR / PyMuPDF   |
| - Composite Indexes    |  | - UCI 130-US Dataset |  | - Inert XML Prompt Isolation|
| - Envers Audit Ledger  |  | - Zero Fabrication   |  +-----------------------------+
+------------------------+  +----------------------+                 |
                                                                     | HTTP Bridge
                                                                     v
                                                      +-----------------------------+
                                                      |   HOST LLM RUNTIME          |
                                                      | Local Ollama Daemon         |
                                                      | - host.docker.internal:11434|
                                                      | - Model: llama3.2:1b        |
                                                      | - Zero Cloud Data Egress    |
                                                      +-----------------------------+
```

---

## 2. Component Layer Breakdown

### 2.1 Presentation Tier: Frontend Web Application
* **Framework**: React 18 with TypeScript and Vite builder.
* **Styling & Layout**: Tailwind CSS with custom responsive utilities, Lucide React icons.
* **State & Networking**:
  * Axios HTTP client with request/response interceptors automatically attaching `Authorization: Bearer <jwt>` and catching `401 Unauthorized` / `403 Forbidden` errors.
  * Native browser `EventSource` client for real-time Server-Sent Events (`/api/notifications/stream`).
* **Bundle Optimization (Phase 6 Hardened)**:
  * Chunk splitting via Vite rollupOptions:
    * `vendor-react`: React, React-DOM, React Router.
    * `vendor-icons`: Lucide React icon library.
    * `vendor-utils`: Axios, Date utilities, DOMPurify.
    * Feature chunks: `auth`, `doctor`, `nurse`, `patient`, `admin`.
* **Security Hardening**:
  * Dynamic Content-Security-Policy (CSP) headers blocking inline scripts without nonces.
  * Strict HTML sanitization via DOMPurify before any medical text rendering.
  * Local session state stored in volatile memory with refresh fallback in `sessionStorage` (cleared on logout).

### 2.2 Core Application Tier: Spring Boot Core Service
* **Framework**: Spring Boot 3.3.4 running on Java 17 LTS.
* **Security Framework**:
  * Spring Security 6 filter chain enforcing stateless sessions (`SessionCreationPolicy.STATELESS`).
  * `JwtAuthenticationFilter` verifying HMAC-SHA256 signatures with 24-hour token expiration.
  * Attribute-Based Access Control (ABAC) implemented via `@PreAuthorize("@consentEvaluator.hasConsent(...)")` across all clinical reading/writing endpoints.
  * Role-Based Access Control (RBAC) via `@PreAuthorize("hasRole('DOCTOR')")`, `hasRole('NURSE')`, `hasRole('ADMIN')`, `hasRole('PATIENT')`.
* **Traffic Control**:
  * Bucket4j token-bucket rate limiter: 5 login attempts/min per IP, 120 API requests/min per IP.
* **Event Dispatcher**:
  * In-memory `ConcurrentHashMap` managing active `SseEmitter` instances keyed by user ID.
  * Scoped notification broadcasts ensure clinicians only receive events for patients they are actively caring for.
* **Data Access**:
  * Spring Data JPA / Hibernate 6 with HikariCP connection pooling.
  * Hibernate Envers integration (`@Audited`) capturing immutable history on `User`, `ConsentRecord`, and `Document` entities.

### 2.3 Persistence Tier: PostgreSQL 16
* **Database Engine**: PostgreSQL 16 Alpine.
* **Migration Management**: Flyway Community Edition managing versioned SQL scripts V1 through V17:
  * `V1__init_schema.sql`: Core schema (users, patients, doctors, nurses, encounters, consents).
  * `V2__seed_demo_data.sql`: Base clinical demo seed data.
  * `V3__nurse_workflow_schema.sql`: Nurse care-team assignments, tasks, and vital signs.
  * `V4__nurse_workflow_seed.sql`: Nurse workflow seed entities.
  * `V5__documents_schema.sql`: Clinical document storage metadata and binary references.
  * `V6__envers_audit_tables.sql`: Immutable audit tables (`revinfo`, `*_aud`).
  * `V7__ai_analysis_schema.sql`: AI extraction results and audit trails.
  * `V8__risk_prediction_schema.sql`: ML risk prediction results and metrics.
  * `V9__patient_portal_views.sql`: Consolidated views for patient self-service.
  * `V10__performance_indexes.sql`: B-tree composite indexes on high-frequency query paths.
  * `V11` to `V17`: Phase 6 and Phase 7 security hardening, constraints, and audit extensions.
* **Indexing Strategy**:
  * Composite index on `consent_record(patient_id, doctor_id, status)` for sub-millisecond ABAC lookups.
  * Composite index on `nurse_task(patient_id, status, priority)` for real-time task queue queries.
  * Composite index on `encounter(patient_id, doctor_id, encounter_date)`.

### 2.4 Supervised ML Risk Tier: Risk Service
* **Framework**: Python 3.11 with FastAPI and Uvicorn.
* **Model Engine**: Scikit-learn `RandomForestClassifier` trained with 200 estimators.
* **Training Dataset**: Authentic **UCI Machine Learning Repository: Diabetes 130-US Hospitals (1999–2008)** dataset (101,766 clinical records).
* **Validated Performance**:
  * Test Accuracy: `0.6898`
  * ROC-AUC Score: `0.6478`
* **Zero-Fabrication Policy**:
  * Missing vital or diagnostic data is never imputed or simulated.
  * Requests with incomplete mandatory features return a verified `INSUFFICIENT_DATA` response.
* **Service Binding**: Bound strictly to localhost/internal Docker network (port 8001), isolated from public ingress.

### 2.5 Grounded Local AI Tier: Agent Service
* **Framework**: Python 3.11 with FastAPI and Uvicorn.
* **OCR & Extraction**:
  * PyMuPDF (`fitz`) for digital PDF text extraction.
  * Tesseract OCR (`pytesseract`) for scanned image and PDF rendering.
* **LLM Engine**:
  * Local Ollama instance running `llama3.2:1b` on the host machine.
  * Connected via Docker bridge `http://host.docker.internal:11434`.
  * Fallback to Google Gemini API only if local Ollama daemon is unreachable.
* **Prompt Isolation & Zero-Hallucination**:
  * Extracted text is encased in `<source_document>` XML tags to defend against prompt injection attacks.
  * Extractor strictly produces `"Not detected"` for any clinical concept absent from the source document.
* **Service Binding**: Bound strictly to localhost/internal Docker network (port 8002), isolated from public ingress.

---

## 3. Network Topology & Isolation Model

```
                    +------------------------------------------+
                    |           EXTERNAL PUBLIC / LAN          |
                    +------------------------------------------+
                                         |
                                         | Port 81 (HTTP) / Port 443 (HTTPS)
                                         v
+------------------------------------------------------------------------------------------+
| DOCKER BRIDGE NETWORK: dmz_net                                                           |
|                                                                                          |
|  [ consentcare-frontend ] (Nginx reverse proxy & static asset host)                      |
|            |                                                                             |
|            | Internal Docker DNS: http://consentcare-core-service:8080                   |
|            v                                                                             |
|  [ consentcare-core-service ] (Spring Boot 3.3.4 Application Server)                     |
+------------------------------------------------------------------------------------------+
                                         |
                                         | Internal Private Interconnect
                                         v
+------------------------------------------------------------------------------------------+
| DOCKER BRIDGE NETWORK: internal_net (internal: true in Production)                       |
|                                                                                          |
|  +---------------------------+  +--------------------------+  +-----------------------+  |
|  | consentcare-postgres      |  | consentcare-risk-service |  | consentcare-agent-svc |  |
|  | Port 5432 (Internal Only) |  | Port 8001 (Loopback Only)|  | Port 8002 (Loop Only) |  |
|  +---------------------------+  +--------------------------+  +-----------------------+  |
+------------------------------------------------------------------------------------------+
                                                                            |
                                                                            | Docker Bridge
                                                                            v
                                                                +-----------------------+
                                                                | Host OS: Ollama:11434 |
                                                                +-----------------------+
```

---

## 4. Key Cross-Cutting Data Workflows

### 4.1 Zero-Trust ABAC Consent Evaluation Flow
```
Doctor Browser                Core Gateway                 PostgreSQL Database
     |                             |                                |
     |-- 1. GET /api/patients/4 -->|                                |
     |   (Bearer JWT)              |-- 2. Authenticate JWT -------->| (Fetch User & Roles)
     |                             |-- 3. Invoke ConsentEvaluator ->|
     |                             |      Query active consent for  |
     |                             |      (patientId=4, doctorId=1) |
     |                             |<-- 4. Result: Active Consent---|
     |                             |-- 5. Fetch Clinical Record --->|
     |                             |<-- 6. Return Entity Data ------|
     |<-- 7. 200 OK (Patient DTO) -|                                |
     |                             |                                |
     |-- 8. Patient Revokes Consent (via Patient Portal) ---------->| Set status='REVOKED'
     |                             |                                |
     |-- 9. GET /api/patients/4 -->|                                |
     |   (Bearer JWT)              |-- 10. Invoke ConsentEvaluator->|
     |                             |       Query active consent     |
     |                             |<-- 11. Result: REVOKED --------|
     |<-- 12. 403 Forbidden -------|                                |
         ("Access Denied: Consent Revoked")
```

### 4.2 Document Ingestion & Zero-Hallucination AI Flow
```
Clinician Browser           Core Gateway             Agent Service          Host Ollama
     |                           |                         |                      |
     |-- 1. POST Multipart ----->|                         |                      |
     |   (/api/documents/upload) |-- 2. Store Binary File  |                      |
     |                           |-- 3. POST /extract ---->|                      |
     |                           |      (Binary Stream)    |-- 4. OCR / Tesseract |
     |                           |                         |-- 5. Structure Prompt|
     |                           |                         |      (<source_doc>)  |
     |                           |                         |-- 6. POST /generate->|
     |                           |                         |      (llama3.2:1b)   |
     |                           |                         |<-- 7. JSON Output ---|
     |                           |                         |   ("Not detected" for|
     |                           |                         |    absent fields)    |
     |                           |<-- 8. DocumentAiResult -|                      |
     |                           |-- 9. Save to Database --|                      |
     |<-- 10. 201 Created -------|                         |                      |
```

### 4.3 Concurrent Nurse Task Claiming Flow
```
Nurse 1 Browser             Core Gateway            PostgreSQL           Nurse 2 Browser
     |                           |                       |                      |
     |-- 1. POST /tasks/12/claim |                       |                      |
     |      (optimistic lock) ->|                       |                      |
     |                           |-- 2. UPDATE WHERE --->|                      |
     |                           |      id=12 AND ver=0  |                      |
     |                           |<-- 3. Rows Updated: 1 |                      |
     |<-- 4. 200 OK (Claimed) ---|                       |                      |
     |                           |                       |                      |
     |                           |   5. POST /tasks/12/claim (simultaneous) <---|
     |                           |   (optimistic lock)---|                      |
     |                           |-- 6. UPDATE WHERE --->|                      |
     |                           |      id=12 AND ver=0  |                      |
     |                           |<-- 7. Rows Updated: 0 |                      |
     |                           |<-- 8. OptimisticLockException                |
     |                           |--- 9. 400 Conflict / Task Taken ------------>|
```

---

## 5. Architectural Quality Attributes

| Quality Attribute | Architectural Provision |
|---|---|
| **Confidentiality** | AES-256 encrypted token payloads, BCrypt hashed credentials (strength 12), TLS encryption in transit. |
| **Integrity** | Hibernate Envers immutable audit trail on clinical entities, database-level foreign key constraints. |
| **Availability** | Stateless containerized services, health check endpoints with Docker automatic restart policies. |
| **Sovereignty** | Attribute-based consent evaluation enforced at the controller method level before any JPA query executes. |
| **Traceability** | MDC request logging attaching UUID correlation IDs to every incoming HTTP request through backend logs. |

