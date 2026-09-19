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
   Flyway V1-V17     (FastAPI / Scikit)  (FastAPI / Ollama)
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
| **Attending Doctor** | `dr.jenkins` | `Doctor@123` | Dr. Sarah Jenkins, MD (Doctor ID 1) |
| **Secondary Doctor** | `dr.vance` | `Doctor@123` | Dr. Marcus Vance, MD (Doctor ID 2) |
| **Care Team Nurse** | `nurse.elena` | `Nurse@123` | Elena Rostova, RN (Nurse ID 1) |
| **Care Team Nurse** | `nurse.david` | `Nurse@123` | David Miller, RN (Nurse ID 2) |
| **Consented Patient** | `patient.eleanor.vance` | `Patient@123` | Eleanor Vance (Patient ID 4) |

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

* **[Clean Installation & Setup Guide](docs/SETUP.md)**: Detailed step-by-step installation instructions.
* **[Final System Inventory](docs/FINAL_SYSTEM_INVENTORY.md)**: Complete catalog of routes, controllers, services, entities, and models.
* **[Final Role & Access Matrix](docs/FINAL_ROLE_MATRIX.md)**: Exhaustive RBAC and ABAC permission boundaries for all 4 roles.
* **[Clinical Demonstration Script](docs/FINAL_DEMO_SCRIPT.md)**: Complete step-by-step demo walkthrough script.
* **[Research Implementation Mapping](docs/RESEARCH_IMPLEMENTATION_MAPPING.md)**: Traceability matrix connecting theoretical research themes to codebase artifacts.
* **[Release Readiness Evaluation](docs/RELEASE_READINESS.md)**: Formal evaluation across all 14 criteria confirming zero blockers.
* **[Final Acceptance & QA Report](docs/FINAL_ACCEPTANCE_REPORT.md)**: Comprehensive empirical verification report and final release decision (**READY FOR RESEARCH DEMO**).
* **[OWASP Verification Report](docs/PHASE6_OWASP_VERIFICATION.md)**: ASVS 5.0.0 Level 2 verification evidence.
* **[API Security Matrix](docs/API_SECURITY_MATRIX.md)**: Endpoint-by-endpoint authorization audit.
