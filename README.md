# ConsentCare EHR

> A patient-governed, zero-trust Electronic Health Record (EHR) system featuring real-time clinical workflows, grounded local document intelligence, machine learning hospital readmission prediction, and OWASP ASVS 5.0.0 (Level 2) hardened security.

---

## 1. System Overview & Core Capabilities

* **Zero-Trust Patient Consent Sovereignty**:
  * Granular patient control across clinical categories (`MEDICAL_HISTORY`, `DIAGNOSES`, `LAB_REPORTS`, `PRESCRIPTIONS`, `DOCUMENTS`, `RISK_ASSESSMENTS`).
  * Physicians cannot access patient records or order interventions without active patient consent.
  * Immediate revocation propagation ("Stop Sharing") halts access instantly (HTTP 403 Forbidden).
* **Dedicated Role Workstations**:
  * **Doctor Clinical Workstation**: Cohort review, longitudinal encounters, diagnoses problem list, multi-item prescriptions, lab test orders, Document AI review, and care-team task delegation.
  * **Nurse Care Workstation**: Real-time task queue, bedside patient safety context, medication administration, vital signs recording, and explicit availability state control (`AVAILABLE` / `BUSY`).
  * **Patient Care & Consent Portal**: Sovereign record control, 1-click consent granting and instant revocation, incoming physician access requests approval/rejection, and audit ledger viewing.
  * **System Administration Console**: Clinician onboarding, care-team assignment, immutable system audit logs, and diagnostic health monitoring (with zero access to clinical charts).
* **Supervised Clinical Readmission Risk Model**:
  * Powered by an authentic `RandomForestClassifier` (200 estimators) trained on 101,766 clinical encounters from the **UCI Diabetes 130-US Hospitals (1999–2008)** dataset (Accuracy: 0.6898, ROC-AUC: 0.6478).
  * Strict zero-fabrication mandate: Incomplete records return `INSUFFICIENT_DATA` rather than guessing missing features.
* **Grounded Local Document AI**:
  * Powered by locally running **Ollama (`llama3.2:1b`)** and Tesseract OCR over internal Docker-to-host bridge (`http://host.docker.internal:11434`).
  * Strict zero-hallucination mandate: Missing clinical data is returned as `"Not detected"`.
  * Adversarial prompt injection defense: Uploaded document text is isolated within inert XML tags without autonomous execution.
* **Hardened Security & Privacy**:
  * Hardened against **OWASP ASVS 5.0.0 (Level 2)**, OWASP Top 10:2025, and OWASP API Top 10:2023.
  * BOLA / IDOR protection across all endpoints; internal microservice ports bound strictly to loopback `127.0.0.1`.
  * Automated regex redaction in audit logs preventing raw passwords, Bearer tokens, or credentials from leaking.

---

## 2. Target Service Architecture

```
[ Frontend: React 18 / Vite / Tailwind ]  ---> Port 81 (Host) / Port 80 (Container)
                |
                v  REST / SSE Stream
[ Core Service: Spring Boot 3.3 / Java 17 ] ---> Port 8081 (Host) / Port 8080 (Container)
        |               |               |
        v               v               v
  [ PostgreSQL 16 ]  [ Risk Svc: 8001 ]  [ Agent Svc: 8002 ]
  (Port 5433)        (127.0.0.1:8001)    (127.0.0.1:8002)
   Flyway V1-V26     (FastAPI / Scikit)  (FastAPI / Ollama & Gemini Vision)
```

---

## 3. Quickstart & Installation

### 3.1 Prerequisites
* Docker Desktop 4.25+ with Docker Engine 26+ and Docker Compose v2+
* Local [Ollama](https://ollama.ai) installed and running on the host machine:
  ```bash
  ollama serve
  ollama pull llama3.2:1b
  ```

### 3.2 Environment Configuration
Copy the template configuration:
```bash
cp .env.example .env
```

### 3.3 Build and Launch Containers
```bash
docker compose build
docker compose up -d
```

### 3.4 Verify Service Health
```bash
docker compose ps
```
All 5 containers must report status `Up (healthy)`.

---

## 4. Default Demonstration Accounts

| Role | Username | Default Password | Clinical Context |
|---|---|---|---|
| **System Administrator** | `admin` | `Admin@12345` | System Administration (`/admin`) |
| **Attending Doctor** | `dr.jenkins` | `Doctor@123` | Dr. Sarah Jenkins, MD (Cardiology) |
| **Secondary Doctor** | `dr.vance` | `Doctor@123` | Dr. Marcus Vance, MD (Endocrinology) |
| **Care Team Nurse** | `nurse.elena` | `Nurse@123` | Elena Rostova, RN (Cardiology) |
| **Care Team Nurse** | `nurse.david` | `Nurse@123` | David Miller, RN (Cardiology) |
| **Care Team Nurse** | `nurse.emily` | `Nurse@123` | Emily Watson, RN (Endocrinology) |
| **Consented Patient** | `patient.eleanor.vance` | `Patient@123` | Eleanor Vance (Cardiology Cohort) |
| **Secondary Patient** | `patient.thomas.clark` | `Patient@123` | Thomas Clark (Endocrinology Cohort) |

*Note: The frontend application is accessible at `http://localhost:81`.*

---

## 5. Automated Verification & Testing

Execute the test suites against running containers:

```powershell
# Maven unit tests (17 checks)
cd core-service; mvn -B test; cd ..

# Phase 3 E2E test suite (Longitudinal records & documents)
powershell -ExecutionPolicy Bypass -File .\test_phase3_e2e.ps1

# Phase 4 E2E test suite (Nurse workflow & concurrency lock)
powershell -ExecutionPolicy Bypass -File .\test_phase4_e2e.ps1

# Phase 5 E2E test suite (Document AI & UCI Random Forest ML)
powershell -ExecutionPolicy Bypass -File .\test_phase5_e2e.ps1

# Phase 6 Security regression suite (36 OWASP ASVS checks)
powershell -ExecutionPolicy Bypass -File .\test_phase6_security_regression.ps1

# Phase 7 Final acceptance suite (29 QA release checks)
powershell -ExecutionPolicy Bypass -File .\test_phase7_acceptance.ps1
```

---

## 6. Comprehensive Project Documentation

### 6.1 Deployment & Operations
* **[Production Deployment Guide](docs/DEPLOYMENT.md)**: Hardened multi-tier deployment, secrets management, and database backup/restore.
* **[Environment Configuration Guide](docs/ENVIRONMENT_CONFIGURATION.md)**: Full catalog of environment variables across all 5 container services.
* **[Troubleshooting & Diagnostic Runbook](docs/TROUBLESHOOTING.md)**: Remediation runbook for Ollama connectivity, ports, rate limiting, and Flyway repairs.
* **[Clean Installation & Setup Guide](docs/SETUP.md)**: Step-by-step developer workstation installation instructions.

### 6.2 System Architecture & Specifications
* **[Final System Architecture](docs/FINAL_SYSTEM_ARCHITECTURE.md)**: Layered architecture, network topologies, data flows, and isolation models.
* **[Final API Specification](docs/FINAL_API_OVERVIEW.md)**: Complete catalog of authenticated endpoints, DTOs, and error codes.
* **[Final Database Schema](docs/FINAL_DATABASE_OVERVIEW.md)**: PostgreSQL 16 schema, Flyway V1–V17 migrations, and composite indexes.
* **[Final Security & Privacy Controls](docs/FINAL_SECURITY_CONTROLS.md)**: OWASP ASVS 5.0.0 Level 2 controls, ABAC evaluator, and prompt shielding.
* **[Final AI & Machine Learning Implementation](docs/FINAL_AI_ML_IMPLEMENTATION.md)**: Local Ollama Document AI, UCI Random Forest ML, and zero-hallucination verification.
* **[Final Role & Permission Matrix](docs/FINAL_ROLE_AND_PERMISSION_MATRIX.md)**: Granular RBAC and ABAC matrix across all 4 user roles.

### 6.3 Demonstration & Project Handover
* **[Comprehensive Project Report](docs/PROJECT_REPORT_AROGYAMITRA_EHR.md)**: Full 11-section institutional project report covering problem statement, system architecture, database design, AI intelligence pipeline, security, and verification.
* **[Downloadable Project Report PDF](docs/ArogyaMitra_EHR_Project_Report.pdf)**: Formal academic/enterprise project report document in PDF format.
* **[Project Handover Dossier](docs/PROJECT_HANDOVER.md)**: Master release document, tech stack, test baseline, and truthful research declaration.
* **[Demonstration Script](docs/DEMO_SCRIPT.md)**: Step-by-step multi-persona clinical demonstration walkthrough.
* **[Demonstration Checklist](docs/DEMO_CHECKLIST.md)**: 10-minute pre-demo readiness checklist and quick recovery runbook.
* **[Demonstration Test Users](docs/DEMO_TEST_USERS.md)**: Full directory of demonstration accounts, credentials, and clinical contexts.
* **[Research Implementation Mapping](docs/RESEARCH_IMPLEMENTATION_MAPPING.md)**: Academic traceability matrix linking research themes to code artifacts.
* **[Release Readiness Evaluation](docs/RELEASE_READINESS.md)**: 14-point release gate evaluation confirming zero release blockers.
* **[Final Acceptance & QA Report](docs/FINAL_ACCEPTANCE_REPORT.md)**: Comprehensive empirical verification report and final release decision (**READY FOR RESEARCH DEMO**).
* **[OWASP ASVS Verification Report](docs/PHASE6_OWASP_VERIFICATION.md)**: OWASP ASVS 5.0.0 Level 2 verification evidence.
