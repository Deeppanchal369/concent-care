# ConsentCare EHR — Demonstration Test Users Catalog

> **Classification**: Demonstration Account Directory  
> **Environment**: Development & Demonstration Stacks  
> **Baseline Version**: v1.0-research-demo  
> **Security Notice**: Passwords listed below are pre-seeded demonstration credentials intended exclusively for evaluation and testing. In production environments, credentials must be generated uniquely and salted via BCrypt.

---

## 1. System Administration

| Username | Password | Role | User ID | Name | Department / Focus | Demo Scenario |
|---|---|---|---|---|---|---|
| `admin` | `Admin@12345` | `ROLE_ADMIN` | 1 | System Administrator | IT & Hospital Operations | User provisioning, care-team assignment, audit log inspection, microservice health monitoring. |

---

## 2. Attending & Specialist Physicians (`ROLE_DOCTOR`)

| Username | Password | Doctor ID | User ID | Full Name | Specialty / Department | Initial Consent & Care-Team Context |
|---|---|---|---|---|---|---|
| `dr.jenkins` | `Doctor@123` | 1 | 2 | Dr. Sarah Jenkins, MD | Cardiology & Internal Medicine | Primary demo physician. Holds active consent from Eleanor Vance. Leads care team with Nurse Elena and Nurse David. |
| `dr.vance` | `Doctor@123` | 2 | 3 | Dr. Marcus Vance, MD | Neurology | Secondary physician. Used for demonstrating access denial when consent is not granted (zero-trust check). |
| `dr.patel` | `Doctor@123` | 3 | 4 | Dr. Priya Patel, MD | Endocrinology | Specialist physician. Used for demonstrating secondary access requests and multi-provider consent sharing. |

---

## 3. Care-Team Nurses (`ROLE_NURSE`)

| Username | Password | Nurse ID | User ID | Full Name | Assigned Department | Care-Team Mapping & Availability |
|---|---|---|---|---|---|---|
| `nurse.elena` | `Nurse@123` | 1 | 5 | Elena Rostova, RN | General Inpatient Medicine | Assigned to Dr. Jenkins' care team. Status: `AVAILABLE`. Primary nurse for task claiming and vital recording. |
| `nurse.david` | `Nurse@123` | 2 | 6 | David Miller, RN | Emergency & Acute Care | Assigned to Dr. Jenkins' care team. Status: `AVAILABLE`. Secondary nurse for demonstrating concurrency locks. |
| `nurse.fatima` | `Nurse@123` | 3 | 7 | Fatima Al-Sayed, RN | Intensive Care Unit (ICU) | Assigned to Dr. Patel's care team. Used for testing cross-team task isolation. |
| `nurse.marcus` | `Nurse@123` | 4 | 8 | Marcus Chen, RN | Pediatrics & Family Medicine | Floating nurse. Used for demonstrating nurse availability toggling (`AVAILABLE` / `BUSY`). |

---

## 4. Patient Health Record Owners (`ROLE_PATIENT`)

| Username | Password | Patient ID | User ID | Full Name | Clinical Profile & Conditions | Initial Relationship / Consent Context |
|---|---|---|---|---|---|---|
| `patient.eleanor.vance` | `Patient@123` | 4 | 12 | Eleanor Vance | Female, Age 58. Type 2 Diabetes, Essential Hypertension, Dyslipidemia. | Primary demo patient. Holds active consent with Dr. Sarah Jenkins. Has uploaded lab documents and encounter history. |
| `patient.john.doe` | `Patient@123` | 1 | 9 | John Doe | Male, Age 45. Acute Bronchitis, Mild Asthma. | Baseline seed patient. Demonstrates basic clinical encounters and prescription items. |
| `patient.jane.smith` | `Patient@123` | 2 | 10 | Jane Smith | Female, Age 34. Routine Health Checkup, Iron Deficiency Anemia. | Seed patient. Demonstrates clean diagnostic history and lab order flows. |
| `patient.robert.taylor` | `Patient@123` | 3 | 11 | Robert Taylor | Male, Age 71. Coronary Artery Disease, Osteoarthritis. | High-risk inpatient. Used for demonstrating `INSUFFICIENT_DATA` vs high-risk ML predictions. |

---

## 5. Quick Persona Selection Guide

* **To demonstrate Patient Consent & 1-Click Revocation**:
  * Log in as `patient.eleanor.vance` -> Go to Consent Center -> Revoke consent for `dr.jenkins`.
* **To demonstrate Doctor Clinical Workflow & AI Intelligence**:
  * Log in as `dr.jenkins` -> View authorized cohort -> Review Eleanor Vance's chart, Document AI, and ML risk.
* **To demonstrate Nurse Bedside Workflow & Concurrency**:
  * Log in as `nurse.elena` -> View assigned task queue -> Complete task.
  * In parallel window, attempt same action as `nurse.david` to demonstrate optimistic lock rejection.
* **To demonstrate Admin Operations & Privacy Boundary**:
  * Log in as `admin` -> View audit logs -> Confirm inability to view patient health charts.
