# ConsentCare REST API Reference

All requests to Core Service should include the `Authorization: Bearer <token>` header, except public authentication routes.

---

## 1. Authentication & System Access

### `POST /api/auth/login`
Authenticates a user and issues a JWT token.
- **Request**:
  ```json
  { "username": "doctor.chen", "password": "Doctor@12345" }
  ```
- **Response**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1...",
    "username": "doctor.chen",
    "role": "DOCTOR",
    "fullName": "Dr. Emily Chen"
  }
  ```

### `POST /api/auth/register`
Self-service registration for patients.
- **Request**:
  ```json
  {
    "username": "patient.john",
    "password": "Patient@12345",
    "fullName": "Johnathan Doe",
    "email": "john.doe@example.com",
    "dateOfBirth": "1985-04-12",
    "gender": "MALE",
    "phone": "+1-555-0199"
  }
  ```

### `GET /api/auth/me`
Returns details of the currently authenticated principal.

---

## 2. Patients & Clinical Relationships

- `GET /api/patients/me` — Patient views their own linked medical record.
- `GET /api/patients/{id}` — Clinician views patient chart (requires active consent).
- `GET /api/doctors/my/patients` — Attending physician views all patients who have granted active consent.
- `GET /api/nurses/my/patients` — Nurse views all patients under their assigned doctor's care team.
- `GET /api/doctors` — Lists verified hospital physicians.
- `GET /api/doctors/{id}/nurses` — Lists care team nurses assigned to a specific physician.
- `POST /api/doctors/assign-nurse` — Assigns a nurse to a physician's care team.

---

## 3. Consent & Access Requests

### `POST /api/consents/grant`
Patient grants permission to a doctor.
- **Request**:
  ```json
  {
    "doctorId": 1,
    "category": "ENTIRE_RECORD",
    "purpose": "Direct Consultation",
    "expiresAt": "2026-10-14T10:00:00Z"
  }
  ```

### `POST /api/consents/revoke/{id}`
Patient instantly terminates a doctor's access to their medical records.

### `POST /api/consents/access-requests`
Doctor initiates an access request to a patient.
- **Request**:
  ```json
  {
    "doctorId": 1,
    "categories": ["LAB_REPORTS", "MEDICATIONS"],
    "notes": "Follow-up for elevated blood pressure"
  }
  ```

### `POST /api/consents/access-requests/{id}/respond`
Patient approves or rejects a doctor's access request.
- **Request**:
  ```json
  { "status": "APPROVED", "durationDays": 30 }
  ```

---

## 4. Clinical Documentation & Workflow

### `POST /api/clinical/encounters`
Doctor documents a patient visit.
- **Request**:
  ```json
  {
    "patientId": 1,
    "encounterType": "OUTPATIENT",
    "chiefComplaint": "Fatigue and elevated blood glucose",
    "clinicalNotes": "Patient reports persistent polydipsia.",
    "assessmentPlan": "Adjust Metformin dosage and order HbA1c."
  }
  ```

### `POST /api/clinical/diagnoses`
Doctor adds a diagnosis to the problem list.
- **Request**:
  ```json
  {
    "patientId": 1,
    "code": "E11.9",
    "description": "Type 2 Diabetes Mellitus",
    "severity": "MODERATE"
  }
  ```

### `POST /api/clinical/lab-requests`
Doctor orders a diagnostic test.
- **Request**:
  ```json
  {
    "patientId": 1,
    "testName": "HbA1c Blood Panel",
    "category": "BIOCHEMISTRY",
    "urgency": "ROUTINE",
    "instructions": "12-hour fasting prior to draw"
  }
  ```

### `POST /api/clinical/observations`
Clinician records vital signs.
- **Request**:
  ```json
  {
    "patientId": 1,
    "vitalType": "BLOOD_PRESSURE",
    "valueNumeric": 128.0,
    "unit": "mmHg",
    "notes": "Right arm seated"
  }
  ```

---

## 5. Prescriptions & Administrations

### `POST /api/prescriptions`
Doctor writes a multi-item prescription.
- **Request**:
  ```json
  {
    "patientId": 1,
    "notes": "Take with breakfast",
    "items": [
      {
        "medicationName": "Metformin",
        "dosage": "500 mg",
        "frequency": "Twice daily",
        "durationDays": 30,
        "instructions": "Take with meals"
      }
    ]
  }
  ```

### `POST /api/prescriptions/administrations`
Nurse records administration of medication.
- **Request**:
  ```json
  {
    "prescriptionItemId": 1,
    "status": "GIVEN",
    "notes": "Tolerated well"
  }
  ```

---

## 6. Nurse Station & Team Coordination

- `GET /api/nurses/my/status` — Retrieves nurse's availability (`AVAILABLE`, `BUSY`, `OFF_DUTY`).
- `PATCH /api/nurses/{id}/status?status=AVAILABLE` — Explicit toggle by nurse to mark availability.
- `POST /api/doctors/tasks` — Doctor delegates task to team nurse (`VITAL_CHECK`, `MEDICATION_ADMINISTRATION`, etc.).
- `GET /api/nurses/my/tasks` — Nurse retrieves assigned tasks.
- `PATCH /api/nurses/tasks/{id}/status` — Nurse updates task status (`ACCEPTED`, `IN_PROGRESS`, `COMPLETED`).

---

## 7. Document Intelligence & ML Risk

### `POST /api/documents/upload` (Multipart Form)
Uploads clinical document (`file`, `patientId`, `category`, `description`). Core Service calls `agent-service` for clinical entity extraction.

### `POST /api/risk/patient/{patientId}`
Doctor triggers 1-click readmission prediction. Core Service extracts patient features via `EhrFeatureService` and calls `risk-service`.
- **Response**:
  ```json
  {
    "patient_id": 1,
    "risk_probability": 0.742,
    "risk_label": "HIGH",
    "top_contributing_factors": {
      "days_since_last_visit": 0.3124,
      "age": 0.2721,
      "chronic_condition_flag": 0.1349,
      "active_prescription_count": 0.0791
    },
    "clinical_disclaimer": "Decision-support only. This prediction is not a medical diagnosis."
  }
  ```

---

## 8. HL7 FHIR R4 Standard Interoperability

- `GET /api/fhir/Patient/{id}` — Standard FHIR R4 Patient resource.
- `GET /api/fhir/Patient/{id}/$everything` — Aggregated FHIR Bundle (`searchset`) containing Patient, Observations, Conditions, and MedicationRequests.
- `GET /api/fhir/Observation?patient={id}` — Observation resources.
- `GET /api/fhir/Condition?patient={id}` — Condition resources.
- `GET /api/fhir/MedicationRequest?patient={id}` — MedicationRequest resources.

---

## 9. Real-Time Notifications (SSE)

- `GET /api/notifications/stream?token=<jwt-token>`
  Server-Sent Events streaming real-time notifications for new prescriptions, lab results, access requests, and nurse tasks.

