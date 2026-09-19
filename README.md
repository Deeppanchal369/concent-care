# ConsentCare EHR

> A patient-governed, zero-trust Electronic Health Record (EHR) system featuring real-time clinical workflows, automated document intelligence, machine learning hospital readmission prediction, and HL7 FHIR R4 interoperability.

---

## Highlights

- **Zero-Trust Patient Consent Engine**: Granular patient control across 11 clinical categories (`CLINICAL_NOTES`, `DIAGNOSES`, `MEDICATIONS`, `LAB_REPORTS`, `VITALS`, etc.). Doctors cannot view records without active patient consent.
- **Dedicated Role Workstations**:
  - **Doctor Clinical Workstation**: Cohort review, clinical encounter documentation, diagnoses problem list, multi-item prescriptions, lab test orders, and care team delegation.
  - **Nurse Care Workstation**: Real-time task queue, medication administration logging (`GIVEN`/`REFUSED`/`HELD`), vital signs recording, and explicit availability state control (`AVAILABLE`/`BUSY`).
  - **Patient Care & Consent Portal**: Sovereign record control, 1-click consent granting and instant revocation, incoming physician access requests approval/rejection, and audit ledger viewing.
  - **Hospital Admin Console**: Clinician onboarding, department management, immutable system audit logs, and AI/ML model metrics.
- **1-Click Clinical Readmission Risk Model**:
  - Powered by a `RandomForestClassifier` trained on a benchmark clinical cohort modeled after the **UCI Diabetes 130-US Hospitals** dataset (Accuracy: 86.9%, Precision: 94.6%, Recall: 88.1%, ROC-AUC: 94.3%).
  - **No manual typing of features**: Features (`days_since_last_visit`, `age`, `active_prescription_count`, `chronic_condition_flag`, `visits_last_12_months`) are automatically computed directly from the patient's EHR records by `EhrFeatureService`.
- **Clinical Document Intelligence**:
  - AI extraction of quantifiable laboratory tests, reference ranges, abnormal flags, medications, and conditions with clinician-facing summaries and regulatory safety disclaimers.
- **Real-Time Notification Pipeline**:
  - Server-Sent Events (SSE) streaming live care alerts (new prescriptions, lab results, nurse task assignments) with instant toast notifications.
- **HL7 FHIR R4 Standard Interoperability**:
  - Standard FHIR projections for `Patient`, `Practitioner`, `Observation`, `Condition`, and `MedicationRequest`, plus an `$everything` searchset bundle.
- **Enterprise Audit Trail**:
  - Full actor attribution (`actor_username`, `actor_role`, `action`, `target`, `timestamp`, `outcome`) with Hibernate Envers revision history (`revinfo_seq INCREMENT BY 50`).

---

## Target Service Architecture

```
[ Frontend: React 19 / Tailwind CSS ]   ---> Port 3000 (Host) / 80 (Container)
                |
                v  REST / SSE Stream
[ Core Service: Spring Boot 3.3 / Java 17 ] ---> Port 8080
       |               |               |
       v               v               v
 [ PostgreSQL 16 ]  [ Risk Svc: 8001 ]  [ Agent Svc: 8002 ]
 (Port 5432)        (FastAPI / Scikit) (FastAPI / NLP)
```

---

## Quickstart (Docker Compose)

### 1. Configure Environment
```bash
cp .env.example .env
```

### 2. Build and Launch
```bash
docker compose up --build -d
```

### 3. Verify Health
```bash
docker compose ps
```
All services should be `Up (healthy)`.

---

## Demo Accounts & Quick Testing

| Role | Username / Email | Password | Workstation |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@consentcare.local` | `Admin@12345` | Hospital Admin Console |
| **Attending Doctor** | `doctor.chen` | `Doctor@12345` | Doctor Clinical Workstation |
| **Care Team Nurse** | `nurse.sarah` | `Nurse@12345` | Nurse Care Workstation |
| **Consented Patient**| `patient.john` | `Patient@12345` | Patient Care & Consent Portal |

*Note: The sign-in page at `http://localhost:3000/login` features quick-fill buttons for each role.*

---

## Comprehensive Documentation Suite

- **[System Architecture](docs/ARCHITECTURE.md)**: Deep dive into microservices, consent security engine, and FHIR views.
- **[Docker Deployment](docs/DOCKER.md)**: Container setup, environment variables, healthchecks, and troubleshooting.
- **[API Reference](docs/API.md)**: Exhaustive REST API specification for all clinical and administrative endpoints.
- **[AI & Machine Learning](docs/AI.md)**: UCI Diabetes readmission model metrics, feature extraction, and document intelligence.
- **[Security & Compliance](docs/SECURITY.md)**: Zero-trust consent rules, JWT/SSE security, and immutable audit logging.
- **[Clinical Demonstration Script](docs/DEMO.md)**: Step-by-step walkthrough covering all 4 roles and end-to-end workflows.
- **[Database Migrations](docs/DATABASE_MIGRATIONS.md)**: Sequential Flyway V1-V12 migration catalog and Envers sequence conventions.
