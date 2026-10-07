# ConsentCare EHR — Environment Configuration Reference

This document provides an exhaustive reference for all environment variables, parameters, and secrets used across the ConsentCare system services.

---

## 1. Environment Variable Catalog

### 1.1 Database Configuration (`postgres` & `core-service`)

| Variable Name | Required | Default in Dev | Production Recommendation | Description |
|---|---|---|---|---|
| `POSTGRES_DB` | Yes | `consentcare` | `consentcare` | Name of the primary PostgreSQL database. |
| `POSTGRES_USER` | Yes | `consentcare` | Unique service user (e.g. `consentcare_app`) | Database administrator/application username. |
| `POSTGRES_PASSWORD` | Yes | `consentcare` | Strong 16+ character random secret | Master database password. **Never commit to Git.** |
| `POSTGRES_PORT` | No | `5433` | Do not publish in prod (`expose: 5432` only) | Host port mapping for development database access. |
| `DB_HOST` | Yes | `postgres` | Container name or database hostname (`postgres`) | Network address of PostgreSQL from `core-service`. |
| `DB_PORT` | No | `5432` | `5432` | Internal database listening port. |

### 1.2 Core Service & Security Configuration (`core-service`)

| Variable Name | Required | Default in Dev | Production Recommendation | Description |
|---|---|---|---|---|
| `JWT_SECRET` | Yes | Template key in `.env.example` | 64+ char cryptographically generated string | Secret key for signing and verifying HMAC-SHA256 JWT tokens. |
| `JWT_EXPIRATION_MS` | No | `86400000` (24h) | `28800000` (8h) or `14400000` (4h) | Token lifetime in milliseconds before re-authentication. |
| `ADMIN_EMAIL` | Yes | `admin@consentcare.local` | Enterprise admin email | Email for the bootstrapped system administrator account. |
| `ADMIN_PASSWORD` | Yes | `Admin@12345` | Complex 16+ char password | Initial password for the bootstrapped admin account. |
| `ADMIN_NAME` | No | `ConsentCare System Administrator` | `ConsentCare Administrator` | Display name for system admin. |
| `CORS_ALLOWED_ORIGINS`| Yes | `http://localhost:81,...` | Exact HTTPS domain (`https://ehr.hospital.org`) | Comma-delimited list of allowed web origins for CORS headers. |
| `UPLOAD_DIR` | No | `/app/uploads` | `/app/uploads` (Mounted Docker volume) | Absolute container path for sandboxed document storage. |
| `CORE_PORT` | No | `8081` | `8080` (or behind reverse proxy) | Host port published for Spring Boot REST API. |

### 1.3 Machine Learning & Document AI Microservices (`agent-service` & `risk-service`)

| Variable Name | Service | Default in Dev | Production Recommendation | Description |
|---|---|---|---|---|
| `AI_PROVIDER` | `agent-service` | `ollama` | `ollama` | Primary Document AI engine (`ollama` or `gemini`). |
| `OLLAMA_BASE_URL` | `agent-service` | `http://host.docker.internal:11434` | `http://host.docker.internal:11434` | Network address of the host-running Ollama daemon. |
| `OLLAMA_MODEL` | `agent-service` | `llama3.2:1b` | `llama3.2:1b` | Exact Ollama model tag for document extraction. |
| `GEMINI_API_KEY` | `agent-service` | `""` (empty) | Set only if cloud fallback is desired | Google Gemini API key (optional fallback). |
| `GEMINI_MODEL` | `agent-service` | `gemini-2.5-flash` | `gemini-2.5-flash` | Cloud model identifier for Gemini fallback. |
| `RISK_SERVICE_URL` | `core-service` | `http://risk-service:8001` | `http://risk-service:8001` | Internal bridge address of the Random Forest microservice. |
| `AGENT_SERVICE_URL`| `core-service` | `http://agent-service:8002` | `http://agent-service:8002` | Internal bridge address of the Document AI microservice. |
| `RISK_PORT` | Compose | `8001` (bound to `127.0.0.1`) | Do not publish host port in production | Host port for local development inspection. |
| `AGENT_PORT` | Compose | `8002` (bound to `127.0.0.1`) | Do not publish host port in production | Host port for local development inspection. |

### 1.4 Frontend Configuration (`frontend`)

| Variable Name | Build Scope | Default in Dev | Production Recommendation | Description |
|---|---|---|---|---|
| `VITE_API_BASE_URL`| Build Arg | `http://localhost:8081` | Reverse proxy URL or public API domain (`https://ehr.hospital.org/api`) | Base URL passed to Vite build for REST client instantiation. |
| `FRONTEND_PORT` | Compose | `81` | `80` (or `443` via TLS proxy) | Host port mapped to Nginx web server. |

---

## 2. Secrets Management Guidelines

1. **Never Commit Secrets**:
   The `.env` file is excluded in `.gitignore`. Always maintain local configurations in `.env` and copy from `.env.example`.
2. **Rotating JWT Secrets**:
   Rotating `JWT_SECRET` immediately invalidates all active client sessions, requiring users to log in again. In production, rotate during scheduled maintenance windows.
3. **Database Credentials**:
   PostgreSQL credentials should be injected via Docker Secrets, HashiCorp Vault, or environment files with restricted file permissions (`chmod 600 .env`).

