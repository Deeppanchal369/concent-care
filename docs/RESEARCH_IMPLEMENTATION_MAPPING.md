# ConsentCare EHR — Research Implementation Mapping

This document provides a grounded, honest mapping between the theoretical research themes and the actual software implementation in the ConsentCare Electronic Health Record (EHR) codebase.

---

## 1. Summary Traceability Matrix

| Research Domain | Core Research Concept | Actual Implementation Status | Codebase Artifacts | Grounded Evidence |
|---|---|---|---|---|
| **EHR Data Management** | Longitudinal structured patient charts & clinical records | **IMPLEMENTED** | `ClinicalRecordService`, `PatientRepository`, `DocumentService`, `Flyway V1–V17` | Standardized encounters, diagnoses, lab reports, vital observations, and sandboxed document management. |
| **Document AI & NLP** | Grounded clinical entity extraction & summarization | **IMPLEMENTED** | `agent-service`, `DocumentAIService`, `OllamaClient`, Tesseract OCR | Local Ollama `llama3.2:1b` with zero-hallucination mandate; extracts labs, medications, and clinical summaries. |
| **Supervised Risk ML** | 30-Day hospital readmission risk prediction | **IMPLEMENTED** | `risk-service`, `RiskEvaluationService`, `readmission_model.joblib` | scikit-learn Random Forest (200 trees) trained on 101,766 UCI Diabetes encounters (Acc: 0.6898, AUC: 0.6478). |
| **Vision Transformers (ViT)** | Visual feature extraction for clinical pathology/radiology | **NOT IMPLEMENTED / FUTURE WORK** | None | Vision Transformers (ViT) are not active in this release. Image documents undergo Tesseract OCR text extraction followed by NLP analysis. |
| **Security & Privacy** | Dynamic patient consent, least privilege, zero trust | **IMPLEMENTED** | `ConsentSecurityEvaluator`, `RateLimitingFilter`, `AuditService` | Granular consent categories, immediate revocation, OWASP ASVS 5.0.0 Level 2 compliance, sensitive data masking. |
| **FHIR Interoperability** | Standard healthcare data interchange | **PARTIALLY IMPLEMENTED (Mapping Level)** | `FhirMapper` / Clinical DTO models | Core entities (Patient, Observation, Condition, MedicationRequest, DiagnosticReport) map to HL7 FHIR R4 schema structures. |
| **Nursing Workflow** | Bedside clinical care delivery & task concurrency | **IMPLEMENTED** | `NurseService`, `NurseTaskRepository`, `CareDtos` | Doctor-nurse care teams, pessimistic write locking (`findByIdForUpdate`), task state machine, bedside safety context. |
| **Healthcare Usability** | Role-tailored responsive clinical interfaces | **IMPLEMENTED** | `frontend/src` (Vite, React 18, Tailwind CSS) | Dedicated dashboards for Patient, Doctor, Nurse, Admin; tested across 7 viewports down to 390px mobile. |
| **Low-Resource Architecture** | Lightweight on-premise execution without cloud lock-in | **IMPLEMENTED** | `docker-compose.yml`, local Ollama bridge, Alpine bases | Runs fully on single workstation with 16GB RAM; 100% offline-capable local AI inference. |

---

## 2. Detailed Domain Analyses

### 2.1 EHR Data Management & Document Center
* **Research Goal**: Unified, longitudinal health record management enabling patients and providers to maintain structured clinical records alongside unstructured medical documents.
* **Actual Implementation**:
  * Fully implemented in PostgreSQL using Flyway migrations `V1` through `V17`.
  * Encounters record date, encounter type, chief complaint, clinical notes, and assessment plans with non-destructive amendments.
  * Diagnoses track ICD-10 codes, clinical severity, and status (`ACTIVE`, `RESOLVED`, `CHRONIC`).
  * Medical documents are stored in sandboxed directories with SHA-256 integrity verification, categorized into `LABORATORY_REPORT`, `PRESCRIPTION`, `DIAGNOSIS_REPORT`, `DISCHARGE_SUMMARY`, or `OTHER`.

### 2.2 Artificial Intelligence & NLP (Document AI)
* **Research Goal**: Automated clinical document summarization and entity extraction to reduce clinician cognitive burden.
* **Actual Implementation**:
  * Implemented in Python 3.11 (`agent-service`) using local Ollama (`llama3.2:1b`) and Tesseract OCR.
  * Strict zero-hallucination mandate: missing data is reported as `"Not detected"` rather than guessed.
  * Prompt injection defense: raw document content is encapsulated in inert XML tags, preventing autonomous execution of instructions embedded in uploaded files.
  * Advisory disclaimer: All AI outputs are labeled as decision-support only and require human clinician review.

### 2.3 Supervised Risk Machine Learning (Random Forest)
* **Research Goal**: Predictive readmission risk modeling grounded in authentic clinical datasets.
* **Actual Implementation**:
  * Implemented in Python 3.11 (`risk-service`) using scikit-learn.
  * Trained on the real-world **UCI Diabetes 130-US Hospitals (1999–2008)** dataset (101,766 encounters, 50 features).
  * Evaluated metrics: Accuracy = 68.98%, ROC-AUC = 0.6478.
  * Strict zero-fabrication policy: When patient encounters lack necessary features (e.g. prior inpatient stays, length of visit), the model returns `INSUFFICIENT_DATA` rather than imputing fake values.

### 2.4 Vision Transformer (ViT) Status
* **Clarification**: Vision Transformers (ViT) are **NOT IMPLEMENTED** in ConsentCare EHR Phase 7.
* **Current Image Processing Pipeline**: Scanned clinical documents and images (`.png`, `.jpg`, `.jpeg`) are processed using Tesseract OCR to extract ASCII text, which is subsequently parsed by the NLP pipeline. No dense vision transformer weights or image classification models are loaded in production containers.

### 2.5 Security, Privacy & Consent
* **Research Goal**: Patient-centric data sovereignty with immediate revocation propagation and tamper-evident auditing.
* **Actual Implementation**:
  * Evaluated against **OWASP ASVS 5.0.0 Level 2**, OWASP Top 10:2025, and OWASP API Top 10:2023.
  * BOLA / IDOR protection across all endpoints; HTTP 403 Forbidden consistently returned on unconsented access.
  * System Administrator is strictly blocked from viewing patient clinical charts.
  * Audit logging masks passwords, Bearer tokens, and secrets prior to persistence.
  * Host port mappings for internal microservices bound strictly to `127.0.0.1`.

### 2.6 Nursing Workflow & Task State Machine
* **Research Goal**: Integrated bedside nursing workflow enabling bidirectional task coordination without race conditions.
* **Actual Implementation**:
  * State machine: `ASSIGNED` -> `ACCEPTED` -> `IN_PROGRESS` -> `COMPLETED`.
  * Availability tracking: `AVAILABLE` -> `BUSY` -> `AVAILABLE`.
  * Concurrency control: Spring Data JPA pessimistic write lock (`SELECT ... FOR UPDATE`) prevents concurrent double-assignment of busy nurses.

### 2.7 Interoperability (FHIR)
* **Research Goal**: Compatibility with standard health information exchange protocols.
* **Actual Implementation**:
  * Internal data models mirror FHIR R4 resource definitions (`Patient`, `Observation`, `Condition`, `MedicationRequest`, `DiagnosticReport`).
  * Direct REST FHIR endpoints are planned for Phase 8; Phase 7 provides internal FHIR-aligned schemas and export compatibility.
