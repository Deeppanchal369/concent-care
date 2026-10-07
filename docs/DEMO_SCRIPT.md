# ConsentCare EHR — Demonstration Script

> **Classification**: Research & Clinical Demonstration Script  
> **Baseline Version**: v1.0-research-demo  
> **Interactive Target URL**: `http://localhost:81`  
> **Detailed Script Companion**: [Full Clinical Script](docs/FINAL_DEMO_SCRIPT.md)

---

## 1. Demonstration Outline

This script provides an end-to-end multi-persona walkthrough showcasing the core research and clinical innovations of the ConsentCare EHR system:
1. **Act 1: System Administration & Care Team Governance** (`admin`)
2. **Act 2: Patient Health Sovereignty & Document Ingestion** (`patient.eleanor.vance`)
3. **Act 3: Clinical Decision Support, Local Document AI & ML Risk Prediction** (`dr.jenkins`)
4. **Act 4: Real-Time Nurse Workflow, Task Claiming & Concurrency Lock** (`nurse.elena` & `nurse.david`)
5. **Act 5: Instant Consent Revocation & Zero-Trust Verification** (`patient.eleanor.vance` -> `dr.jenkins`)

---

## 2. Walkthrough Steps

### Act 1: Administration & Privacy Boundary
* **Persona**: System Administrator (`admin` / `Admin@12345`)
* **URL**: `http://localhost:81/admin`
1. Log in as `admin`.
2. Inspect the **Staff Directory**: Notice Dr. Sarah Jenkins (Cardiology/Internal Medicine) and assigned nurses (Elena Rostova, David Miller).
3. Demonstrate **Principle of Least Privilege / Admin Blindness**:
   * Attempt to access patient clinical records (`/patients/4`).
   * Verify that administrators receive an immediate **HTTP 403 Access Denied** — administrative privileges do not grant access to private health charts.
4. Inspect the **Immutable Audit Log**:
   * Point out actor attribution, timestamps, actions (`LOGIN`, `PROVISION`), and automatic redaction of sensitive credentials (`***REDACTED***`).
5. Log out.

---

### Act 2: Patient Sovereignty & Document Upload
* **Persona**: Patient Eleanor Vance (`patient.eleanor.vance` / `Patient@123`)
* **URL**: `http://localhost:81/dashboard`
1. Log in as `patient.eleanor.vance`.
2. View sovereign health overview, longitudinal vitals, and condition history.
3. Ingest medical record:
   * Go to **Documents** -> Click **Upload Document**.
   * Select a PDF or image report (e.g. `Comprehensive Metabolic & Glycemic Panel`).
   * Note file validation (magic byte check, size check) and secure sandboxed storage.
4. Expand Care Circle:
   * Go to **Find Doctors** -> Search `Dr. Sarah Jenkins`.
   * Click **Request Consultation / Grant Access**.
   * Select categories: `Medical History`, `Diagnoses`, `Lab Reports`, `Prescriptions`, `Documents`, `Risk Assessments`.
   * Submit access request.
5. Log out.

---

### Act 3: Clinical Decision Support & Document AI
* **Persona**: Dr. Sarah Jenkins, MD (`dr.jenkins` / `Doctor@123`)
* **URL**: `http://localhost:81/dashboard`
1. Log in as `dr.jenkins`.
2. Review incoming notifications: Eleanor Vance's access request is received.
3. Click **Approve Access**: Patient Eleanor Vance is now authorized in Dr. Jenkins' cohort.
4. Open Eleanor Vance's clinical record (`/patients/4`):
   * Access is granted dynamically by the ABAC `ConsentSecurityEvaluator`.
5. Review **Document AI Analysis**:
   * Open the uploaded document.
   * View extraction powered by local Ollama `llama3.2:1b`:
     * Structured Lab Values: Fasting Glucose, HbA1c, Creatinine.
     * Detected Medications: Metformin, Lisinopril.
     * Symptoms: `"Not detected"` (strict zero-hallucination mandate).
     * Source document prompt isolation (`<source_document>`).
6. Run **Supervised ML Readmission Risk Assessment**:
   * Click **Run AI Risk Assessment**.
   * Real Random Forest model (UCI Diabetes dataset, 101,766 training encounters) computes readmission risk.
   * Review risk probability and clinical factors.
7. Delegate Bedside Task to Nurse:
   * Click **Delegate Task to Nurse**.
   * Select Nurse: `Elena Rostova, RN`.
   * Task: `Perform Bedside Blood Glucose Check (Q4H) & Administer Morning Metformin`.
   * Priority: `URGENT`.
   * Submit task.
8. Log out.

---

### Act 4: Real-Time Nurse Workflow & Concurrency Control
* **Personas**: Elena Rostova, RN (`nurse.elena` / `Nurse@123`) and David Miller, RN (`nurse.david` / `Nurse@123`)
* **URL**: `http://localhost:81/dashboard`
1. Log in as `nurse.elena`.
2. Notice the real-time notification stream: New urgent task delegated by Dr. Jenkins.
3. Navigate to **Nurse Workstation** -> View assigned task queue.
4. Claim and update task:
   * Transition state from `PENDING` to `IN_PROGRESS`.
   * Record bedside blood glucose vital sign (118 mg/dL).
   * Record bedside medication administration (Metformin 500mg Oral).
   * Mark task as `COMPLETED`.
5. Demonstrate **Optimistic Locking Concurrency Defense**:
   * If two nurses attempt to claim or update the same task simultaneously, Spring Data `@Version` detects the concurrent collision and safely rejects the second request (HTTP 400 Conflict) without state corruption.
6. Log out.

---

### Act 5: Sovereign Consent Revocation ("Stop Sharing")
* **Personas**: Eleanor Vance (`patient.eleanor.vance`) -> Dr. Sarah Jenkins (`dr.jenkins`)
1. Log in as Patient Eleanor Vance (`patient.eleanor.vance` / `Patient@123`).
2. Go to **Consent Center**:
   * View active consent granted to Dr. Sarah Jenkins.
3. Click **"Stop Sharing" / Revoke Consent**:
   * Consent status immediately transitions to `REVOKED` in the database.
4. Log out.
5. Log in as Doctor Sarah Jenkins (`dr.jenkins` / `Doctor@123`):
   * Attempt to open Eleanor Vance's patient record or access her chart.
   * Notice immediate enforcement: **HTTP 403 Forbidden ("Access Denied: Consent Revoked")**.
   * Longitudinal history, documents, risk assessments, and prescriptions are instantly locked.
6. End of demonstration.

