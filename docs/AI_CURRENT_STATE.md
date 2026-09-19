# ConsentCare EHR — AI & ML Current State Audit

**Audit Date**: September 19, 2026  
**Evaluation Baseline**: ConsentCare Core Engineering Rules & OWASP ASVS 5.0.0  
**Audit Objective**: Identify actual working code, synthetic/mocked models, hard-coded values, duplicate logic, and security vulnerabilities across `agent-service`, `risk-service`, `core-service`, and the frontend before implementing Phase 5.

---

## 1. Executive Summary

Prior to Phase 5, the application contained placeholder AI architectures that simulated machine learning and clinical document processing rather than executing true supervised ML on real clinical datasets or real document parsers:

| Component | Status | Issue / Finding |
| :--- | :--- | :--- |
| **`risk-service` Model** | **Synthetic / Mocked** | Did not use the real UCI Diabetes 130-US Hospitals dataset. Generated 5,000 synthetic rows with `np.random` and a mathematical logit function. |
| **`risk-service` Data** | **Missing Dataset** | `diabetic_data.csv` was missing from the repository. |
| **`risk-service` Features** | **Fabricated Fallbacks** | `core-service` injected default values (e.g. `age=45`, `daysSinceLastVisit=30`) instead of reporting insufficient data. |
| **`agent-service` Document AI** | **Mocked / Empty Text** | `core-service` only extracted text from `.txt` and `.csv`. PDFs, images, and Word docs were sent with empty string `""` text. |
| **`agent-service` Confidence** | **Hard-Coded** | `confidence_score: 0.93` hard-coded in Python; `0.9200` and `0.8500` hard-coded in Java. |
| **`agent-service` OCR** | **Not Implemented** | No OCR engine (`tesseract`, `pytesseract`, `Pillow`) installed in container or used in code. |
| **`agent-service` Word Parser**| **Not Implemented** | No `.docx` parser (`python-docx`) installed in container. |
| **Authorization Boundary** | **Duplicated / Bypassed**| `agent.py` attempted duplicate consent checks (`evaluate_access`), while `RiskController` lacked doctor-patient consent checks (BOLA risk). |

---

## 2. Component-by-Component Detailed Audit

### 2.1 `risk-service` (Port 8001)

#### Files Inspected
- `risk-service/main.py`
- `risk-service/train_pipeline.py`
- `risk-service/train_model.py`
- `risk-service/metrics.json`
- `risk-service/model.joblib` / `model_v1.0.joblib`
- `risk-service/requirements.txt`
- `risk-service/Dockerfile`

#### Findings
1. **Synthetic Training Data**:
   In `train_pipeline.py` (lines 31–74), the function `generate_uci_diabetes_cohort()` synthesized 5,000 synthetic rows using `np.random.default_rng` and calculated a synthetic target via logit formula:
   ```python
   logit = -2.6 + 0.022 * (age - 50) + 0.005 * days_since_last_visit + ... + rng.normal(0, 0.4, size=n)
   prob = 1.0 / (1.0 + np.exp(-logit))
   y = (prob > 0.35).astype(int)
   ```
   **Zero real patient records from the actual UCI 130-US Hospitals dataset were used.**
2. **Missing Dataset**:
   The actual UCI Diabetes 130-US Hospitals dataset (`diabetic_data.csv`, 101,766 clinical encounters) was completely absent from the project.
3. **No Handling for Insufficient Data**:
   The API assumed all 7 features were always present. If features were missing or unpopulated, it did not return `INSUFFICIENT_DATA`.
4. **Architectural Structure**:
   Missing canonical ML pipeline directories: `data/`, `preprocessing/`, `training/`, `models/`, `inference/`, `evaluation/`, `tests/`.

---

### 2.2 `agent-service` (Port 8002)

#### Files Inspected
- `agent-service/main.py`
- `agent-service/agent.py`
- `agent-service/document_processor.py`
- `agent-service/llm_client.py`
- `agent-service/requirements.txt`
- `agent-service/Dockerfile`

#### Findings
1. **Hard-Coded Confidence Scores**:
   `agent-service/main.py` line 79 returned `"confidence_score": 0.93`.
2. **Missing Real Document Parsing & OCR**:
   - `requirements.txt` contained only: `fastapi`, `uvicorn`, `pydantic`, `httpx`, `pypdf`.
   - Missing: `pytesseract`, `Pillow`, `python-docx`.
   - `Dockerfile` did not install the system `tesseract-ocr` binary or OCR language packs.
   - Images (`.jpg`, `.jpeg`, `.png`) and Word documents (`.docx`) could not be read.
3. **Duplicated / Misplaced Authorization**:
   `agent.py` defined `check_consents` and `evaluate_access`. As mandated by ConsentCare architecture rules, Python microservices must never evaluate consent or determine authorization—Spring Boot is the sole security boundary.
4. **LLM Client / Provider Configuration**:
   - `llm_client.py` points to `OPENAI_COMPATIBLE_BASE_URL` (currently empty).
   - Local Ollama is active on the host (`http://localhost:11434`), but currently has no models pulled (`models: []`).
   - The fallback generator in `document_processor.py` was a basic string join without structured schema validation, clinical uncertainty detection, or prompt-injection defense.

---

### 2.3 `core-service` AI Integration

#### Files Inspected
- `core-service/src/main/java/com/consentcare/core/service/DocumentService.java`
- `core-service/src/main/java/com/consentcare/core/service/EhrFeatureService.java`
- `core-service/src/main/java/com/consentcare/core/service/RiskService.java`
- `core-service/src/main/java/com/consentcare/core/controller/RiskController.java`
- `core-service/src/main/java/com/consentcare/core/controller/AgentController.java`

#### Findings
1. **Document Upload Skipped Text Extraction**:
   In `DocumentService.java` (lines 81–86):
   ```java
   String extractedText = "";
   if (extension.equals("txt") || extension.equals("csv")) {
       extractedText = Files.readString(target, StandardCharsets.UTF_8);
   }
   ```
   For all PDFs, Word documents, and images, `extractedText` remained `""`.
2. **Fake Fallback Analysis**:
   In `DocumentService.java` (lines 188–211), `runFallbackClinicalAnalysis` fabricated static findings and a hardcoded confidence score:
   ```java
   String summary = "Document categorized as " + reportType + " (" + fileName + "). Automated clinical inspection found standardized format with patient verification.";
   String entities = "{\"report_type\":\"" + reportType + "\",\"tests\":[{\"name\":\"Clinical Review\",\"result\":\"Recorded in chart\",\"status\":\"NORMAL\"}],...}";
   .confidenceScore(new BigDecimal("0.8500"))
   ```
3. **Fabricated Patient Features**:
   In `EhrFeatureService.java` (lines 33, 40):
   ```java
   int age = 45; // Fabricated if patient DOB missing
   int daysSinceLastVisit = 30; // Fabricated if no visits
   int missedAppointmentsCount = 0; // Hardcoded default
   ```
   Missing clinical data was silently replaced with defaults instead of evaluating data completeness or flagging `INSUFFICIENT_DATA`.
4. **Security & Authorization Vulnerabilities**:
   - `RiskController.java` `@PostMapping("/patient/{patientId}")`: Only checked `@PreAuthorize("hasRole('DOCTOR')")`, failing to check if the doctor had an active, valid consent for that patient or the `RISK_ASSESSMENTS` category (Broken Object-Level Authorization / BOLA).
   - `@PostMapping("/predict")` and `AgentController` `@PostMapping("/risk-aware-alert")`: Did not enforce doctor role or consent checks.

---

### 2.4 Frontend & UI

#### Findings
1. **Doctor Patient Workspace**:
   - `PatientDetail.tsx` had tabs for 9 clinical sections, but lacked an **AI Insights** tab.
   - `client.ts` defined `predictPatientRisk()`, but it was not exposed or integrated into doctor views.
2. **Document Center**:
   - `DocumentCenter.tsx` displayed an AI Modal with summary, report type, and confidence score, but displayed the fabricated/hard-coded results.

---

## 3. Remediation Roadmap for Phase 5

1. **Real Supervised ML Pipeline**:
   - Ingest the official UCI Diabetes 130-US Hospitals dataset (`diabetic_data.csv`, 101,766 records).
   - Implement structured preprocessing: age transformation, handling missing values, encoding diagnostic ICD categories, feature selection.
   - Train a genuine `RandomForestClassifier` for 30-day readmission prediction.
   - Evaluate model rigorously: Accuracy, Precision, Recall, F1, ROC-AUC, and Confusion Matrix.
   - Version the trained model artifact (`readmission-risk v1.0`).
2. **Zero-Fabrication Feature Adapter & Insufficient Data Handling**:
   - Implement `PatientFeatureAdapter` in `risk-service` and `core-service`.
   - Check data completeness. If required clinical parameters (e.g. DOB/age, encounters) are missing, strictly return `INSUFFICIENT_DATA` ("Insufficient information for this research risk assessment.").
3. **Multi-Format Document Processing & Real OCR**:
   - Enhance `agent-service/Dockerfile` with `tesseract-ocr` and language data.
   - Add `pytesseract`, `Pillow`, and `python-docx` to `requirements.txt`.
   - Update `DocumentService` to send the actual document bytes to `agent-service`.
   - Parse PDFs directly with `pypdf`, images with OCR (`pytesseract`), and Word documents with `python-docx`.
   - If text cannot be detected, return `"Not detected"`—never guess.
4. **Grounded AI Extraction & Prompt Injection Defense**:
   - Constrain structured output schema: `documentType`, `summary`, `findings`, `labResults`, `medications`, `diagnosesMentioned`, `symptomsMentioned`, `uncertainItems`.
   - Explicitly separate `SYSTEM INSTRUCTIONS` from `DOCUMENT CONTENT` to prevent prompt injection.
   - Add clinical disclaimer on all AI outputs: `"Research decision-support only. This is not a diagnosis or treatment recommendation."`
5. **Strict Spring Boot Authorization & BOLA Prevention**:
   - Secure all AI endpoints with `@PreAuthorize("@consentSecurityEvaluator.canAccessPatientCategory(...)")`.
   - Deny unauthorized doctors and patients access to clinical ML risk assessments.
   - Audit-log all AI requests and results.
6. **Doctor AI UI ("AI Insights")**:
   - Add dedicated "AI Insights" section to `PatientDetail.tsx` for authorized doctors with active consent.
   - Present human-readable risk estimate, model version, contributing factors, data completeness, and document summaries. Never show raw JSON or model tensors.

