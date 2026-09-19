# ConsentCare Clinical Demonstration Script

This end-to-end scenario guides evaluators through the complete clinical workflow of ConsentCare across all four supported roles:

---

## 1. Demo Credentials

| Role | Username / Email | Password | Primary Interface |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@consentcare.local` | `Admin@12345` | Hospital Admin Console |
| **Attending Doctor** | `doctor.chen` | `Doctor@12345` | Doctor Clinical Workstation |
| **Care Team Nurse** | `nurse.sarah` | `Nurse@12345` | Nurse Care Workstation |
| **Consented Patient**| `patient.john` | `Patient@12345` | Patient Care & Consent Portal |

*Tip: The login page at `http://localhost:3000/login` features quick-fill buttons for each role.*

---

## 2. Walkthrough Scenario: Care for Patient Johnathan Doe

### Step 1: Patient Self-Governance & Consent (Login as Patient John)
1. Navigate to `http://localhost:3000/login` and click **"👤 Consented Patient"** (or sign in with `patient.john` / `Patient@12345`).
2. You enter the **Patient Care & Consent Portal**:
   - Notice John's health stats: active consents, prescriptions, lab results, and vitals recorded.
3. Click the **"Active Sharing"** tab:
   - View Dr. Emily Chen's active consent policy.
   - Test sovereign control: click **"Stop Sharing"** on any category or grant a new consent to Dr. Marcus Vance using the **"+ Share Records with Doctor"** button.
4. Click the **"AI Document Locker"** tab:
   - Upload a clinical report file. Watch the real-time AI summary and extracted lab entities appear immediately.
5. Click **"Logout"** in the top navigation bar.

---

### Step 2: Doctor Clinical Workstation & 1-Click ML Risk Prediction (Login as Doctor Chen)
1. Sign in with **"🩺 Attending Doctor"** (`doctor.chen` / `Doctor@12345`).
2. You enter the **Doctor Clinical Workstation**:
   - Notice the cohort of patients who have granted active consent.
3. Locate **Johnathan Doe (MRN #1)** and click **"Open Clinical Chart →"**.
4. Inside the Clinical Chart:
   - Notice the dark **30-Day Hospital Readmission Risk Score** card at the top.
   - Click the **"⚡ Calculate Readmission Risk"** button.
   - Core Service automatically computes features from John's EHR records (`days_since_last_visit`, `age`, `active_prescription_count`, `chronic_condition_flag`) and queries `risk-service`.
   - The gauge renders the probability score, classification (`HIGH`, `MODERATE`, or `LOW`), and the top contributing clinical factors with feature weights!
5. Navigate through the Clinical Chart tabs:
   - **Encounters**: Click **"+ Encounter"** to record an outpatient consultation note.
   - **Prescriptions**: Click **"+ Prescribe"** to issue a new medication (e.g. *Atorvastatin 20mg*). An instant notification will be dispatched to John!
   - **Labs & Diagnostics**: Click **"+ Order Lab"** to order a *Lipid Panel (Urgent)*.
   - **HL7 FHIR R4 Interop**: Click the FHIR tab to view the live JSON projection of John's FHIR Patient resource and `$everything` searchset bundle!
6. Return to Workstation and click **"+ Delegate Nurse Task"**:
   - Assign a **VITAL_CHECK** task to **Nurse Sarah Jenkins** for patient Johnathan Doe with priority **STAT**.
7. Click **"Logout"**.

---

### Step 3: Nurse Station & Availability Toggle (Login as Nurse Sarah)
1. Sign in with **"💉 Care Nurse"** (`nurse.sarah` / `Nurse@12345`).
2. You enter the **Nurse Care Workstation**:
   - Notice the status banner: Nurse Sarah is currently **AVAILABLE** or **BUSY**.
   - Test explicit availability: click **"✓ Mark as Available"** or **"⏸ Mark as Busy"**. ConsentCare never silently frees a nurse until they explicitly declare availability!
3. Review the **Assigned Clinical Tasks** queue:
   - Notice the task delegated by Dr. Chen.
   - Click **"Start Task"** (status changes to `IN_PROGRESS`).
   - Click **"+ Record Vitals"** to enter John's blood pressure (`124/82`) or heart rate (`72 bpm`).
   - Click **"Mark Done"** (status changes to `COMPLETED`).
4. Click **"Logout"**.

---

### Step 4: Enterprise Audit & Model Oversight (Login as Hospital Admin)
1. Sign in with **"⚙️ Hospital Admin"** (`admin@consentcare.local` / `Admin@12345`).
2. You enter the **Hospital Admin Console**:
   - Notice total patient, doctor, nurse, and active consent metrics across the health network.
3. Click the **"Immutable Audit Logs"** tab:
   - Inspect the complete audit trail: every chart view, prescription issuance, consent grant, and vital sign record is logged with actor username, timestamp, and outcome.
4. Click the **"ML Readmission Model v1.0"** tab:
   - Review live performance metrics (Accuracy: 86.9%, Precision: 94.6%, Recall: 88.1%, ROC-AUC: 94.3%).
   - Inspect feature weight breakdown and dataset provenance.

