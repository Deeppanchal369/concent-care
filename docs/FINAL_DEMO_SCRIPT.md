# ConsentCare EHR — Final Live Demonstration Script

This script provides a step-by-step clinical walkthrough for demonstrating the end-to-end capabilities of the ConsentCare Electronic Health Record (EHR) system.

---

## Act 1: System Administration & Care Team Provisioning

**Persona**: System Administrator (`admin` / `Admin@12345`)  
**URL**: `http://localhost:81/admin`

1. **Log in as Administrator**:
   * Navigate to `http://localhost:81/login`.
   * Log in with username `admin` and password `Admin@12345`.
   * Land on the System Administration Dashboard (`/admin`).
2. **Review User Management**:
   * Point out the existing clinical staff:
     * Doctor: **Dr. Sarah Jenkins, MD** (`dr.jenkins`, Doctor ID 1, Cardiology/Internal Medicine).
     * Nurses: **Elena Rostova, RN**, **David Miller, RN**, **Fatima Al-Sayed, RN**, **Marcus Chen, RN**.
     * Patient: **Eleanor Vance** (`patient.eleanor.vance`, Patient ID 4).
   * Demonstrate assigning nurses to Dr. Jenkins' care team.
3. **Verify Least-Privilege Clinical Privacy**:
   * Attempt to open a patient clinical record directly or browse patient charts.
   * Point out that the administrative console strictly isolates patient clinical data: administrators manage accounts and audits, but **cannot view private patient health records**.
4. **Inspect Immutable Audit Logs**:
   * View the real-time system audit log table.
   * Observe actor attribution, timestamps, actions (`LOGIN`, `PROVISION_USER`), and note that sensitive credentials/passwords are automatically redacted (`***REDACTED***`).
5. **Log Out**.

---

## Act 2: Patient Health Sovereignty & Document Management

**Persona**: Patient Eleanor Vance (`patient.eleanor.vance` / `Patient@123`)  
**URL**: `http://localhost:81/dashboard`

1. **Log in as Patient Eleanor Vance**:
   * Enter credentials and log in.
   * View the personal health summary, longitudinal vitals, and condition history.
2. **Upload Medical Document**:
   * Navigate to the **Document Center** (`/documents`).
   * Click **Upload Document**.
   * Upload `clinical_blood_report.txt` or a laboratory PDF.
   * Set Category: `LABORATORY_REPORT`.
   * Title: `Comprehensive Metabolic & Glycemic Panel Q3 2026`.
   * Click **Upload & Process**.
   * Show that the document enters the secure storage sandbox and triggers background extraction.
3. **Request Doctor Access (Care Circle Expansion)**:
   * Navigate to **Find Doctors**.
   * Search for `Dr. Sarah Jenkins`.
   * Click **Request Consultation / Grant Access**.
   * Select granular categories:
     - [x] Medical History & Encounters
     - [x] Laboratory & Diagnostic Reports
     - [x] Prescriptions & Medications
     - [x] Clinical Documents
     - [x] Readmission Risk Assessments
   * Set Purpose: `Cardiovascular and glycemic metabolic review`.
   * Set Duration: `30 Days`.
   * Submit the access request.
   * Show the request pending in Eleanor's **Consent Center**.
4. **Log Out**.

---

## Act 3: Clinical Decision Support, Document AI & Risk Prediction

**Persona**: Doctor Sarah Jenkins, MD (`dr.jenkins` / `Doctor@123`)  
**URL**: `http://localhost:81/dashboard`

1. **Log in as Doctor Sarah Jenkins**:
   * View the Doctor Dashboard with notifications and pending access requests.
2. **Approve Patient Access Request**:
   * Open the notification for Eleanor Vance's access request.
   * Review requested categories and purpose.
   * Click **Approve Access**.
   * Eleanor Vance now appears in Dr. Jenkins' authorized patient cohort.
3. **Review Patient Longitudinal Chart**:
   * Open Eleanor Vance's clinical record (`/patients/4`).
   * Review longitudinal vitals, chronic conditions, and past encounters.
4. **Inspect Grounded Document AI Extraction**:
   * Click the **Documents** tab.
   * Select `Comprehensive Metabolic & Glycemic Panel Q3 2026`.
   * Point out the **Grounded AI Analysis** panel powered by local Ollama `llama3.2:1b`:
     * Structured Lab Values: Fasting Glucose (115 mg/dL - HIGH), HbA1c (6.4% - HIGH), Creatinine (0.92 mg/dL - NORMAL).
     * Detected Medications: Metformin 500mg, Lisinopril 10mg.
     * Symptoms: `"Not detected"` (strictly zero-hallucination).
     * Prominent Clinical Advisory Disclaimer.
5. **Execute Supervised ML Readmission Risk Assessment**:
   * Navigate to the **Risk Assessment** card.
   * Click **Run AI Risk Assessment**.
   * The Python `risk-service` executes the trained Random Forest model (UCI Diabetes dataset).
   * Observe the result:
     * Readmission Probability: ~21.88% (MODERATE RISK).
     * Model Version: `readmission-risk v1.0` (101,766 training encounters).
     * Key clinical risk factors displayed transparently without raw matrix noise.
6. **Order Clinical Interventions**:
   * **Write Prescription**: Prescribe `Metformin HCl 500mg Oral Twice Daily`.
   * **Order Lab Request**: Order `Fasting Lipid Panel & HbA1c Repeat`.
7. **Delegate Bedside Task to Care-Team Nurse**:
   * Click **Assign Nurse Task**.
   * Select available care-team nurse: **Elena Rostova, RN**.
   * Task Type: `MEDICATION_ADMINISTRATION`.
   * Priority: `URGENT`.
   * Instructions: `Administer oral Metformin 500mg and verify bedside BP`.
   * Click **Assign Task**.
   * Observe that Nurse Elena Rostova's status automatically transitions from `AVAILABLE` to `BUSY`.
8. **Log Out**.

---

## Act 4: Bedside Nursing Delivery & Task Completion

**Persona**: Nurse Elena Rostova, RN (`nurse.elena` / `Nurse@123`)  
**URL**: `http://localhost:81/dashboard`

1. **Log in as Nurse Elena Rostova**:
   * View the Nurse Dashboard. Notice status is currently **`BUSY`** with an assigned clinical duty.
2. **Review Bedside Safety Context**:
   * Open the assigned task for Eleanor Vance.
   * Inspect the bedside safety context: Patient Age (68), Gender (Female), Blood Group (O+), Allergies (Penicillin, Sulfa drugs).
3. **Execute Task State Machine**:
   * Click **Accept Task** (transitions status from `ASSIGNED` to `ACCEPTED`).
   * Click **Start Task** (transitions status to `IN_PROGRESS`).
   * Administer medication and measure vitals.
   * Add Clinical Completion Note: `Administered Metformin 500mg PO with water. Bedside BP 122/78 mmHg, HR 72 bpm. Patient tolerating well.`
   * Click **Complete Task**.
4. **Verify Automatic Availability Recovery**:
   * Observe that upon completing the final duty, Elena's status server-side automatically returns to **`AVAILABLE`**, ready for subsequent clinical assignments.
5. **Log Out**.

---

## Act 5: Immediate Revocation & Privacy Audit Verification

**Persona**: Patient Eleanor Vance (`patient.eleanor.vance` / `Patient@123`)  
**URL**: `http://localhost:81/dashboard`

1. **Log in as Patient Eleanor Vance**:
   * View the **Care Circle** showing Dr. Sarah Jenkins and Nurse Elena Rostova actively caring for her.
   * Review notifications confirming medication administration and lab order creation.
2. **Exercise Immediate Consent Revocation ("Stop Sharing")**:
   * In the Care Circle / Consent Center, locate Dr. Sarah Jenkins.
   * Click **Revoke Access / Stop Sharing**.
   * Confirm the revocation modal.
   * Notice Dr. Jenkins is immediately removed from the active Care Circle.
3. **Log Out**.

---

## Act 6: Zero-Trust Post-Revocation Verification

**Persona**: Doctor Sarah Jenkins, MD (`dr.jenkins` / `Doctor@123`)  
**URL**: `http://localhost:81/dashboard`

1. **Log in as Doctor Sarah Jenkins**:
   * Observe that Eleanor Vance is **no longer visible** in Dr. Jenkins' authorized patient cohort.
2. **Direct URL Attempt (BOLA Defense Check)**:
   * Attempt to navigate directly to `http://localhost:81/patients/4`.
   * Observe that the server returns **`HTTP 403 Forbidden`**.
   * Access to encounters, diagnoses, documents, and risk predictions is immediately severed.
3. **Log Out**.

---

## Act 7: Administrative Audit Trail Confirmation

**Persona**: System Administrator (`admin` / `Admin@12345`)  
**URL**: `http://localhost:81/admin`

1. **Log in as Administrator**:
   * Open **Audit Logs**.
   * Show the complete, chronologically ordered, immutable audit log:
     - `CONSENT_GRANTED` by `patient.eleanor.vance`
     - `DOCUMENT_UPLOADED` by `patient.eleanor.vance`
     - `DOCUMENT_AI_ANALYSIS` by `dr.jenkins`
     - `ML_RISK_PREDICTION` by `dr.jenkins`
     - `MEDICATION_PRESCRIBED` by `dr.jenkins`
     - `NURSE_TASK_ASSIGNED` by `dr.jenkins`
     - `MEDICATION_ADMINISTERED` by `nurse.elena`
     - `CONSENT_REVOKED` by `patient.eleanor.vance`
     - `ACCESS_DENIED` (403) on post-revocation probe
   * Verify all actions are attributed, timestamped, and zero passwords or tokens leak.
2. **Conclusion**: End of demonstration.
