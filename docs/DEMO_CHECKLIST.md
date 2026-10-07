# ConsentCare EHR — Demonstration Checklist & Runbook

> **Classification**: Demonstration Readiness Checklist  
> **Target Audience**: Research Presenters, Clinical Demonstrators, Evaluators  
> **Baseline Version**: v1.0-research-demo

---

## 1. Pre-Demonstration Verification Checklist

Complete this checklist 10 minutes prior to any live presentation or evaluation.

### Phase A: Infrastructure & Docker Services
- [ ] **Docker Engine Active**: Docker Desktop is running and responsive.
- [ ] **All 5 Containers Healthy**:
  ```powershell
  docker compose ps
  ```
  Expected output:
  * `consentcare-postgres`: `Up (healthy)`
  * `consentcare-core-service`: `Up (healthy)`
  * `consentcare-frontend`: `Up (healthy)`
  * `consentcare-risk-service`: `Up (healthy)`
  * `consentcare-agent-service`: `Up (healthy)`

### Phase B: Local AI LLM Service (Ollama)
- [ ] **Ollama Service Running on Host**:
  ```powershell
  curl http://localhost:11434/api/tags
  ```
  Must return HTTP 200 with model list.
- [ ] **Model Pulled & Ready**:
  Verify `llama3.2:1b` is present:
  ```powershell
  ollama list
  ```
  If missing:
  ```powershell
  ollama pull llama3.2:1b
  ```
- [ ] **Bridge Reachability from Containers**:
  ```powershell
  docker exec -it consentcare-agent-service curl -s http://host.docker.internal:11434/api/tags
  ```
  Must successfully list models without connection refusal.

### Phase C: Web Application Endpoints
- [ ] **Frontend Web Application**: Open `http://localhost:81` in browser. Login page renders cleanly.
- [ ] **Core Backend Health Probe**: Open `http://localhost:8081/actuator/health`. Returns `{"status":"UP"}`.
- [ ] **ML Risk Model Metrics Probe**:
  ```powershell
  docker exec -it consentcare-risk-service curl -s http://localhost:8001/metrics
  ```
  Returns `{"accuracy": 0.6898, "roc_auc": 0.6478}`.

---

## 2. Test Account Verification

Verify that all primary demonstration accounts authenticate successfully:

| Role | Username | Password | Quick Verification Check |
|---|---|---|---|
| **System Admin** | `admin` | `Admin@12345` | Can view `/admin` dashboard |
| **Attending Doctor** | `dr.jenkins` | `Doctor@123` | Can view patient list `/dashboard` |
| **Care Team Nurse** | `nurse.elena` | `Nurse@123` | Can view `/dashboard` task queue |
| **Consented Patient**| `patient.eleanor.vance` | `Patient@123` | Can view personal health record |

---

## 3. Demonstration Assets Preparation

- [ ] **Sample Medical Documents Ready**:
  Have a sample lab report or clinical summary PDF/TXT file on your local machine ready to upload:
  * File type: `.pdf` or `.txt`
  * Size: < 20 MB
  * Recommended filename: `Metabolic_Panel_Q3_2026.pdf`
- [ ] **Browser Sessions Prepared**:
  * Recommended approach: Use separate browser windows or profiles for each persona:
    * Window 1 (Standard): `dr.jenkins` (Doctor)
    * Window 2 (Incognito): `patient.eleanor.vance` (Patient)
    * Window 3 (Secondary Browser / Profile): `nurse.elena` (Nurse)
    * Window 4 (Secondary Browser / Profile): `admin` (System Administrator)
  * This allows seamless demonstration of multi-persona workflows, instant notifications, and real-time consent revocation without constant re-logging.

---

## 4. Quick Reset / Recovery Procedures

### Scenario 1: State Reset (Return to Fresh Baseline)
If previous demo actions (such as consent revocation or task completions) need to be reset:
```powershell
docker compose down -v
docker compose up -d
```
*Note: This re-runs all Flyway migrations (V1 to V17) and re-seeds clean demo data in ~45 seconds.*

### Scenario 2: Ollama Connection Refused
If the Document AI reports fallback or error:
```powershell
# Restart Ollama on host
Stop-Process -Name "ollama" -ErrorAction SilentlyContinue
ollama serve
```

### Scenario 3: Container Restart
If a single microservice needs restarting:
```powershell
docker compose restart consentcare-agent-service
docker compose restart consentcare-core-service
```

