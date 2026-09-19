# ConsentCare EHR — AI & Machine Learning Architecture

## 1. System Overview & Component Topology

ConsentCare integrates artificial intelligence and machine learning strictly as **clinical decision support**. The architecture is partitioned into loosely-coupled, specialized services interconnected via internal Docker networking:

```
                                      +---------------------------------------------+
                                      |                 Browser UI                  |
                                      |         React 19 + TypeScript + Vite        |
                                      +---------------------------------------------+
                                                             |
                                                             | HTTPS / JSON (JWT Auth)
                                                             v
                                      +---------------------------------------------+
                                      |                core-service                 |
                                      |           Spring Boot 3.3.4 (Java 17)       |
                                      |   * Sole Authorization Boundary (OWASP)    |
                                      |   * Consent Security Evaluator (RBAC/ABAC)  |
                                      |   * EHR Feature Extractor (Zero-Mock)       |
                                      +---------------------------------------------+
                                         /                         \
           Internal REST (Multipart)   /                             \   Internal REST (JSON)
                                     v                                 v
   +-------------------------------------------+     +-------------------------------------------+
   |               agent-service               |     |               risk-service                |
   |          FastAPI + PyPDF + Tesseract      |     |        FastAPI + Scikit-Learn 1.5         |
   |   * Multi-format Document Processing      |     |   * Supervised Readmission ML Model       |
   |   * Ollama / Gemini Multi-provider        |     |   * Trained on UCI Diabetes Dataset       |
   |   * Grounded Entity Extraction            |     |   * Zero-Fabrication Feature Adapter      |
   +-------------------------------------------+     +-------------------------------------------+
                 |
                 v
   +---------------------------+
   |    Local Ollama Daemon    |
   |  http://host.docker.      |
   |  internal:11434           |
   |  (llama3.2:1b)            |
   +---------------------------+
```

---

## 2. The Sole Authorization Boundary

In strict compliance with ConsentCare Core Engineering Rules and OWASP ASVS 5.0.0:
1. **Zero Authorization in AI Microservices**: `agent-service` and `risk-service` are purely computational internal workers. They do not evaluate tokens, user identities, or patient consents.
2. **Spring Boot Gatekeeper**: Every request to process a document or predict clinical risk MUST pass through `core-service`:
   - `@PreAuthorize("hasRole('DOCTOR') and @consentSecurityEvaluator.canAccessPatientCategory(authentication, #patientId, 'RISK_ASSESSMENTS')")`
   - BOLA / IDOR checks verify that the authenticated actor has an active, unrevoked consent grant covering the required category.
   - Revocation or expiration of consent takes effect immediately on the next request.

---

## 3. Real AI/ML Implementation (Zero Mock / Zero Fabrication)

### Document Understanding (`agent-service`)
- **Multi-Format Ingestion**: Native text extraction from PDFs (`pypdf`), Word documents (`python-docx`), and plain text (`.txt`).
- **Optical Character Recognition (OCR)**: Embedded Tesseract OCR (`pytesseract`) for medical scans, photos, and rasterized PDFs.
- **Strict Structured Schemas**: Enforces strict JSON extraction schemas (document type, clinical summary, lab results with flags, medications, diagnoses, and symptoms).
- **Prompt Injection Defense**: Untrusted file content is strictly isolated within XML-style `<document_content>` boundary tags, instruction overrides are blocked, and extraction outputs are sanitized.
- **Provider Architecture**:
  - Primary Provider: Local Ollama (`llama3.2:1b`) reachable via `http://host.docker.internal:11434`.
  - Fallback Cloud Provider: Google Gemini (`gemini-2.5-flash`) via direct server-side REST (API key never exposed to client).
  - Graceful Degradation: If AI engines are offline, a deterministic clinical extractor parses laboratory test values and presents: `"AI analysis is temporarily unavailable. You can still view the original report."`

### Patient Risk Prediction (`risk-service`)
- **Supervised Training on Real Clinical Data**: Trained on 101,766 genuine patient encounters from the UCI Diabetes 130-US Hospitals dataset (1999–2008).
- **Ensemble ML**: Scikit-Learn `RandomForestClassifier` with balanced class weighting, fixed random state (42), and robust cross-validation.
- **Zero Imputation / Zero Fabrication**: Missing clinical features are never filled with hardcoded assumptions (e.g. `age=45` or `days=30`). If essential clinical history is missing, the model returns `status: INSUFFICIENT_DATA` with the explanation:
  `"Insufficient information for this research risk assessment."`

---

## 4. Advisory-Only Mandate

Under clinical safety rules:
- AI predictions are labeled as decision-support aids only.
- AI never directly writes to diagnostic charts, alters medications, approves access requests, or assigns nursing tasks.
- Every prediction or extracted finding displayed in the clinician UI carries the mandatory advisory disclaimer:
  > *"Research decision-support only. This is not a diagnosis or treatment recommendation."*

