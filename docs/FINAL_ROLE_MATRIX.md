# ConsentCare EHR — Final Role & Access Control Matrix

This document defines the strict Role-Based Access Control (RBAC) and Attribute-Based Access Control (ABAC) matrix enforced across all ConsentCare EHR endpoints, services, and user interfaces.

---

## 1. Role Overview & Core Principles

ConsentCare enforces four distinct user roles based on the **Principle of Least Privilege**:
1. **`ROLE_ADMIN` (System Administrator)**: Infrastructure management, user provisioning, system auditing. Strictly blocked from clinical records.
2. **`ROLE_DOCTOR` (Physician / Diagnostician)**: Clinical decision support, encounters, diagnoses, lab orders, prescriptions, Document AI review, supervised ML risk evaluation, nurse delegation. Access to patient records strictly bounded by patient-granted consent.
3. **`ROLE_NURSE` (Care Team Nurse)**: Bedside care delivery, vital observation recording, task execution, medication administration. Access bounded by doctor care-team assignment and active patient consent.
4. **`ROLE_PATIENT` (Record Owner)**: Sole granter and revoker of consent, document uploader, personal health record viewer, Care Circle manager.

---

## 2. Comprehensive Role Permission Matrix

| Functional Capability | `ADMIN` | `DOCTOR` | `NURSE` | `PATIENT` | Enforcement Mechanism |
|---|---|---|---|---|---|
| **User Authentication & Profile** |
| Login / Logout | ALLOWED | ALLOWED | ALLOWED | ALLOWED | `AuthController` / JWT Filter |
| View Own Profile (`/me`) | ALLOWED | ALLOWED | ALLOWED | ALLOWED | `SecurityContextHolder` |
| Patient Self-Registration | BLOCKED | BLOCKED | BLOCKED | ALLOWED | Public endpoint |
| Provision Doctor/Nurse Users | ALLOWED | BLOCKED | BLOCKED | BLOCKED | `@PreAuthorize("hasRole('ADMIN')")` |
| **Administrative & System Ops** |
| View System Audit Logs | ALLOWED | BLOCKED | BLOCKED | BLOCKED | `@PreAuthorize("hasRole('ADMIN')")` |
| List Entire Patient Directory | ALLOWED | BLOCKED | BLOCKED | BLOCKED | `@PreAuthorize("hasRole('ADMIN')")` |
| Assign Nurses to Doctors | ALLOWED | BLOCKED | BLOCKED | BLOCKED | `@PreAuthorize("hasRole('ADMIN')")` |
| Access Microservice `/health` | ALLOWED | BLOCKED | BLOCKED | BLOCKED | `@PreAuthorize("hasRole('ADMIN')")` |
| **Patient Clinical Records** |
| View Own Patient Profile | N/A | N/A | N/A | ALLOWED | Ownership validation |
| View Patient Record By ID | BLOCKED | CONSENT ONLY | ASSIGNED ONLY | OWN RECORD ONLY | `ConsentSecurityEvaluator` |
| Direct Clinical Chart Access | BLOCKED | CONSENT ONLY | ASSIGNED ONLY | OWN RECORD ONLY | `BOLA-2` check |
| Longitudinal Encounter History | BLOCKED | CONSENT ONLY | BLOCKED | OWN RECORD ONLY | Category: `MEDICAL_HISTORY` |
| Longitudinal Diagnoses | BLOCKED | CONSENT ONLY | BLOCKED | OWN RECORD ONLY | Category: `DIAGNOSES` |
| Longitudinal Lab Reports | BLOCKED | CONSENT ONLY | BLOCKED | OWN RECORD ONLY | Category: `LAB_REPORTS` |
| Longitudinal Prescriptions | BLOCKED | CONSENT ONLY | ASSIGNED ONLY | OWN RECORD ONLY | Category: `PRESCRIPTIONS` |
| Patient Access Log Timeline | BLOCKED | BLOCKED | BLOCKED | OWN RECORD ONLY | Patient ownership check |
| **Clinical Interventions** |
| Create Clinical Encounter | BLOCKED | CONSENT ONLY | BLOCKED | BLOCKED | Category: `MEDICAL_HISTORY` |
| Amend Clinical Encounter | BLOCKED | AUTHOR ONLY | BLOCKED | BLOCKED | Original author match |
| Record Diagnosis | BLOCKED | CONSENT ONLY | BLOCKED | BLOCKED | Category: `DIAGNOSES` |
| Update Diagnosis Status | BLOCKED | AUTHOR ONLY | BLOCKED | BLOCKED | Author verification |
| Write Prescription | BLOCKED | CONSENT ONLY | BLOCKED | BLOCKED | Category: `PRESCRIPTIONS` |
| Record Medication Administration | BLOCKED | ALLOWED | CARE TEAM ONLY | BLOCKED | Active delegation check |
| Record Vital Observations | BLOCKED | CONSENT ONLY | CARE TEAM ONLY | BLOCKED | Care-team & consent check |
| **Consent Management** |
| Request Access to Records | BLOCKED | ALLOWED | BLOCKED | ALLOWED | `ConsentService` |
| Direct Consent Grant | BLOCKED | BLOCKED | BLOCKED | ALLOWED | `@PreAuthorize("hasRole('PATIENT')")` |
| Revoke Consent / Stop Sharing | ALLOWED (Break-glass) | BLOCKED | BLOCKED | ALLOWED | Owner / Admin check |
| View My Care Circle | BLOCKED | N/A | N/A | ALLOWED | Patient ownership |
| View Authorized Patient Cohort | BLOCKED | CONSENT ONLY | BLOCKED | BLOCKED | Filtered query |
| **Document Management** |
| Upload Medical Document | BLOCKED | CONSENT ONLY | BLOCKED | OWN RECORD ONLY | Path sandboxing |
| View / Preview Document | BLOCKED | CONSENT/SHARE | BLOCKED | OWN RECORD ONLY | Sandbox CSP + `nosniff` |
| Download Document File | BLOCKED | CONSENT/SHARE | BLOCKED | OWN RECORD ONLY | Content-Disposition: attachment |
| Soft-Archive Document | BLOCKED | BLOCKED | BLOCKED | OWN RECORD ONLY | Record owner check |
| Share Document Directly | BLOCKED | BLOCKED | BLOCKED | ALLOWED | Record owner check |
| **AI & Decision Support** |
| View Document AI Extraction | BLOCKED | CONSENT ONLY | BLOCKED | OWN RECORD ONLY | Category: `DOCUMENTS` |
| Request ML Risk Assessment | BLOCKED | CONSENT ONLY | BLOCKED | BLOCKED | Category: `RISK_ASSESSMENTS` |
| View ML Risk History | BLOCKED | CONSENT ONLY | BLOCKED | OWN RECORD ONLY | Category: `RISK_ASSESSMENTS` |
| **Nurse Care-Team Workflow** |
| Order / Assign Nurse Task | BLOCKED | CARE TEAM ONLY | BLOCKED | BLOCKED | Pessimistic write lock |
| View Assigned Tasks | BLOCKED | MY TASKS ONLY | MY TASKS ONLY | BLOCKED | User ID filtering |
| Accept / Start / Complete Task | BLOCKED | BLOCKED | ASSIGNED NURSE | BLOCKED | Task assignee verification |
| Reset Availability Status | BLOCKED | BLOCKED | OWN STATUS | BLOCKED | Nurse ID check |

---

## 3. Strict Prohibitions (Zero Exceptions)

1. **System Administrator Clinical Blindness**:
   `ADMIN` cannot read, search, view, or modify clinical records, diagnoses, lab results, prescriptions, vitals, or medical documents.
2. **Zero Cross-Patient Visibility**:
   Patients cannot view or query records, documents, or notifications belonging to other patients.
3. **Zero Unconsented Doctor Access**:
   Doctors cannot view patient records without an active, non-expired, non-revoked consent covering the requested category.
4. **Zero Cross-Team Nurse Tasks**:
   Doctors cannot assign clinical tasks to nurses who are not part of their authorized care team.
5. **Zero Unauthorized Nurse Admin**:
   Nurses cannot administer medications to patients unless assigned under a doctor holding active patient consent.

