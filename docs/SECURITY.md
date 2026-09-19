# ConsentCare Security & Compliance Architecture

## 1. Zero-Trust Healthcare Access Model

ConsentCare strictly adheres to the principle of least privilege and zero-trust patient governance:

1. **Patient Data Sovereignty**:
   A patient's chart is not accessible by default to any medical staff. Only upon the patient granting explicit consent—or approving an `AccessRequest` submitted by a doctor—is the doctor authorized to view records.

2. **No Administrative Backdoor into Clinical Records**:
   System Administrators can manage infrastructure, oversee user accounts, and review compliance audit logs, but the `ConsentSecurityEvaluator` strictly prohibits administrators from reading private clinical encounters or medical notes without medical consent.

3. **Care Team Privilege Delegation**:
   Nurses can only access charts of patients assigned to the active attending physician with whom they have a verified `DoctorNurseAssignment`.

---

## 2. Granular Consent Categories

Consent policies can be restricted to 11 granular healthcare categories:
- `ENTIRE_RECORD` (Full Clinical History)
- `GENERAL_RECORDS`
- `CLINICAL_NOTES` (Consultation notes & encounters)
- `DIAGNOSES` (Problem list & conditions)
- `MEDICATIONS` (Prescription orders & administrations)
- `LAB_REPORTS` (Pathology & blood test results)
- `VITALS` (Observations & physiological readings)
- `DOCUMENTS` (File uploads & scans)
- `MENTAL_HEALTH` (Sensitive psychiatric records)
- `HIV_STATUS` (Sensitive infectious disease markers)
- `GENETIC_DATA` (Genomic sequences & variant analyses)

---

## 3. Authentication & Session Security

- **JSON Web Tokens (JWT)**: Signed using HMAC-SHA256 with 256-bit secret keys.
- **Server-Sent Events (SSE) Authentication**:
  Native browser `EventSource` does not support custom request headers; ConsentCare allows a validated query parameter `?token=<jwt>` exclusively on `/api/notifications/stream`, validated via `JwtAuthFilter`.
- **BCrypt Password Hashing**: Passwords salted and hashed with BCrypt (strength 10).
- **Public Registration Isolation**: Public sign-up strictly creates `PATIENT` role accounts. `DOCTOR`, `NURSE`, and `ADMIN` credentials can only be provisioned by authenticated administrators.

---

## 4. Immutable Audit Ledger (HIPAA & GDPR)

Every interaction with a clinical resource is permanently logged into `audit_logs` and `access_logs`:
- `actor_username`: Exact username of the person who initiated the request.
- `actor_role`: Attributed role (`DOCTOR`, `NURSE`, `PATIENT`, `ADMIN`).
- `action`: Specific operation (`VIEW_CHART`, `CREATE_PRESCRIPTION`, `GRANT_CONSENT`, `REVOKE_CONSENT`, `RECORD_VITAL`, `ML_RISK_PREDICTION`).
- `resource_type` and `resource_id`: Target entity.
- `timestamp`: UTC ISO timestamp.
- `result`: Outcome (`SUCCESS` or `DENIED`).

