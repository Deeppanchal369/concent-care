# ConsentCare EHR — System Setup & Clean Installation Guide

This guide details the exact procedure for setting up, configuring, and running the ConsentCare Electronic Health Record (EHR) system from a clean environment.

---

## 1. Prerequisites & System Requirements

### 1.1 Operating System & Tooling
* **Operating System**: Windows 10/11 (with WSL2), macOS, or Ubuntu 22.04+ LTS
* **Docker Desktop**: Version 4.25+ with Docker Engine 26+ and Docker Compose v2+
* **Java Development Kit (JDK)**: OpenJDK 17 or Eclipse Temurin 17
* **Apache Maven**: Version 3.8+
* **Node.js**: Version 20 LTS (`node -v` >= 20.0.0, `npm -v` >= 10.0.0)
* **Python**: Version 3.11+ (if running Python microservices natively outside Docker)

### 1.2 Local Ollama (Primary AI Provider)
ConsentCare utilizes local Ollama as the default Document AI provider to eliminate external cloud dependencies:
1. Install Ollama from [ollama.ai](https://ollama.ai).
2. Start Ollama on the host:
   ```bash
   ollama serve
   ```
3. Pull the required model:
   ```bash
   ollama pull llama3.2:1b
   ```
4. Verify the model is active:
   ```bash
   curl http://localhost:11434/api/tags
   ```

---

## 2. Environment Configuration

1. In the repository root, copy the environment configuration template:
   ```bash
   cp .env.example .env
   ```
2. Verify default settings in `.env`:
   * `AI_PROVIDER=ollama`
   * `OLLAMA_MODEL=llama3.2:1b`
   * `OLLAMA_BASE_URL=http://host.docker.internal:11434`
   * `JWT_SECRET=<32+ character secret>`
   * `DB_USER=consentcare`
   * `DB_PASSWORD=consentcare`
   * `DB_NAME=consentcare`

---

## 3. Fresh Installation & Build

### 3.1 Build Backend
```bash
cd core-service
mvn -B clean package -DskipTests
cd ..
```

### 3.2 Build Frontend
```bash
cd frontend
npm ci
npm run build
cd ..
```

### 3.3 Build and Launch Docker Containers
```bash
docker compose build
docker compose up -d
```

### 3.4 Verify Service Health
```bash
docker compose ps
```
Expected output:
* `consentcare-postgres`: Up (healthy) on port `5433->5432`
* `consentcare-risk-service`: Up (healthy) on port `127.0.0.1:8001`
* `consentcare-agent-service`: Up (healthy) on port `127.0.0.1:8002`
* `consentcare-core-service`: Up (healthy) on port `8081->8080`
* `consentcare-frontend`: Up on port `81->80`

---

## 4. Automated Database Schema Migrations (Flyway)

Upon starting `core-service`, Flyway automatically runs all migrations in `core-service/src/main/resources/db/migration`:
* `V1__init_schema.sql` through `V16__...`
* `V17__security_and_performance_hardening.sql` (adds composite performance indexes)

To verify database schema status:
```bash
curl -s http://localhost:8081/actuator/health
```
Response must indicate `{"status":"UP"}` with database component health.

---

## 5. Default Seed Accounts

The clean installation initializes with the following demonstration accounts:

| Role | Username | Default Password | Clinical Identifier |
|---|---|---|---|
| **Administrator** | `admin` | `Admin@12345` | System Admin |
| **Doctor** | `dr.jenkins` | `Doctor@123` | Dr. Sarah Jenkins, MD (Doctor ID 1) |
| **Doctor** | `dr.vance` | `Doctor@123` | Dr. Marcus Vance, MD (Doctor ID 2) |
| **Nurse** | `nurse.elena` | `Nurse@123` | Elena Rostova, RN (Nurse ID 1) |
| **Nurse** | `nurse.david` | `Nurse@123` | David Miller, RN (Nurse ID 2) |
| **Patient** | `patient.eleanor.vance` | `Patient@123` | Eleanor Vance (Patient ID 4) |

---

## 6. Running Verification Test Suites

Execute all automated verification suites:

```powershell
# Unit tests
cd core-service; mvn -B test; cd ..

# Phase 3: Clinical records, FHIR compatibility, documents
powershell -ExecutionPolicy Bypass -File .\test_phase3_e2e.ps1

# Phase 4: Nurse workflow, concurrency lock, task state machine
powershell -ExecutionPolicy Bypass -File .\test_phase4_e2e.ps1

# Phase 5: Ollama Document AI, UCI Random Forest ML, prompt injection
powershell -ExecutionPolicy Bypass -File .\test_phase5_e2e.ps1

# Phase 6: OWASP ASVS security, BOLA, rate limiting, audit masking
powershell -ExecutionPolicy Bypass -File .\test_phase6_security_regression.ps1

# Phase 7: Final acceptance and release QA
powershell -ExecutionPolicy Bypass -File .\test_phase7_acceptance.ps1
```

All 6 test suites must complete with **100% PASS** and zero failures.

