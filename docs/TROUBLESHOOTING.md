# ConsentCare EHR — Operational Troubleshooting Guide

This guide provides diagnostic procedures and actionable resolutions for common operational, development, and deployment issues encountered in the ConsentCare EHR system.

---

## 1. Quick Diagnostic Checklist

When experiencing issues, run this standard triage sequence:
```bash
# 1. Check all container states
docker compose ps

# 2. Check Core Service health endpoint
curl -s http://localhost:8081/actuator/health

# 3. Check Agent Service health (Ollama & OCR)
curl -s http://127.0.0.1:8002/health

# 4. Check Risk Service health (Random Forest ML)
curl -s http://127.0.0.1:8001/health

# 5. Check Ollama host tags
curl -s http://localhost:11434/api/tags
```

---

## 2. Common Issues & Solutions

### 2.1 Local Ollama Connectivity Failures
* **Symptom**: `agent-service` logs show `httpx.ConnectError: [Errno 111] Connection refused` or `Document AI processing failed: Ollama unreachable`.
* **Root Cause**: The Ollama daemon is not running on the Windows/macOS host, or Docker container cannot reach the host IP.
* **Resolution**:
  1. Verify Ollama is running on the host:
     ```bash
     ollama list
     ```
  2. If not running, start it:
     ```bash
     ollama serve
     ```
  3. Confirm the model `llama3.2:1b` is installed:
     ```bash
     ollama pull llama3.2:1b
     ```
  4. On Windows/macOS, ensure `OLLAMA_BASE_URL=http://host.docker.internal:11434` is set in `.env`.
  5. If on native Linux, Docker does not automatically support `host.docker.internal`. Add `extra_hosts: ["host.docker.internal:host-gateway"]` to `docker-compose.yml` or set `OLLAMA_BASE_URL=http://172.17.0.1:11434`.

---

### 2.2 Host Port Conflicts
* **Symptom**: `docker compose up` fails with `Error response from daemon: driver failed programming external connectivity on endpoint: Bind for 0.0.0.0:8081 failed: port is already allocated`.
* **Root Cause**: Another local service (e.g. Jenkins, local Tomcat, another Postgres) is occupying one of ConsentCare's published host ports.
* **Resolution**:
  1. Identify the colliding process on Windows PowerShell:
     ```powershell
     Get-NetTCPConnection -LocalPort 8081, 81, 5433, 8001, 8002 -ErrorAction SilentlyContinue | Select-Object LocalPort, OwningProcess
     ```
  2. Or modify the conflicting port in your `.env` file without changing internal container wiring:
     ```env
     CORE_PORT=8085
     FRONTEND_PORT=85
     POSTGRES_PORT=5435
     ```
  3. Rebuild and restart:
     ```bash
     docker compose up -d
     ```

---

### 2.3 HTTP 429 Too Many Requests (Rate Limiting)
* **Symptom**: Rapid API calls or login attempts fail with `HTTP 429 Too Many Requests` and response header `Retry-After: 60`.
* **Root Cause**: `RateLimitingFilter` enforces a sliding-window token bucket:
  * `/api/auth/login`: 10 requests per minute per IP.
  * General `/api/*`: 60 requests per minute per IP.
* **Resolution**:
  * Automated scripts must implement backoff retry when encountering HTTP 429.
  * For manual testing, pause for 60 seconds to allow the token bucket to replenish.

---

### 2.4 HTTP 403 Forbidden on Clinical Actions
* **Symptom**: A Doctor receives HTTP 403 when trying to view a patient chart, write a prescription, or view Document AI results.
* **Root Cause**: ConsentCare enforces strict Attribute-Based Access Control (ABAC). The doctor lacks an active, non-expired consent covering the specific requested category.
* **Resolution**:
  * Verify whether the patient has granted consent for the required category:
    * Encounters / History -> `MEDICAL_HISTORY`
    * Diagnoses -> `DIAGNOSES`
    * Lab Reports -> `LAB_REPORTS`
    * Prescriptions -> `PRESCRIPTIONS`
    * Uploaded Documents & AI -> `DOCUMENTS`
    * Risk Assessments -> `RISK_ASSESSMENTS`
  * Log in as the Patient, navigate to **Care Circle / Find Doctors**, and grant the required categories.

---

### 2.5 HTTP 400 Bad Request on Nurse Task Assignment
* **Symptom**: Doctor attempts to assign a task to a nurse and receives HTTP 400 or HTTP 403.
* **Root Cause**:
  1. **HTTP 403**: The nurse is not assigned to the doctor's care team, or the doctor does not hold active consent for the patient.
  2. **HTTP 400**: The nurse is currently **`BUSY`** with another clinical duty.
* **Resolution**:
  * Ensure the nurse is assigned to the doctor's care team in Admin console (`/admin`).
  * Check nurse availability in the Doctor dashboard; assign only to nurses with status **`AVAILABLE`**.

---

### 2.6 File Upload Rejections
* **Symptom**: Document upload fails with `HTTP 400 Bad Request` and message like `"Disallowed file extension"`, `"Invalid file signature"`, or `"File size exceeds limit"`.
* **Root Cause**: `DocumentSecurityValidator` enforces strict pre-storage validation:
  1. Maximum file size: 20 MB.
  2. Allowed extensions: `.pdf`, `.txt`, `.png`, `.jpg`, `.jpeg`, `.doc`, `.docx`, `.csv`.
  3. Binary magic bytes: A file renamed to `.pdf` but containing executable binary bytes (`MZ`) or script headers will be rejected immediately.
* **Resolution**: Ensure the uploaded file matches supported clinical formats and contains valid binary headers.

---

### 2.7 Database Schema / Flyway Locks
* **Symptom**: `core-service` fails to start with `FlywayException: Schema "public" has a failed migration`.
* **Root Cause**: An unexpected container shutdown occurred while Flyway was applying a migration script.
* **Resolution**:
  1. Connect to the database:
     ```bash
     docker exec -it consentcare-postgres psql -U consentcare -d consentcare
     ```
  2. Inspect migration history:
     ```sql
     SELECT installed_rank, version, description, success FROM flyway_schema_history;
     ```
  3. Repair schema history if required:
     ```sql
     DELETE FROM flyway_schema_history WHERE success = false;
     ```
  4. Restart `core-service`:
     ```bash
     docker compose restart core-service
     ```

