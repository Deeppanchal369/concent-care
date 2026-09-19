# ConsentCare Docker Deployment Guide

## 1. Overview

ConsentCare uses Docker Compose to orchestrate 5 isolated services interconnected via Docker's internal DNS network:

| Service | Container Name | Internal Port | Host Port | Healthcheck |
| :--- | :--- | :--- | :--- | :--- |
| **PostgreSQL** | `consentcare-postgres` | 5432 | `5432` | `pg_isready` |
| **Risk Service** | `consentcare-risk-service` | 8001 | `8001` | HTTP `/health` |
| **Agent Service** | `consentcare-agent-service` | 8002 | `8002` | HTTP `/health` |
| **Core Service** | `consentcare-core-service` | 8080 | `8080` | Actuator `/actuator/health` |
| **Frontend** | `consentcare-frontend` | 80 | `3000` | Nginx HTTP 200 |

---

## 2. Environment Configuration

All environment configurations are managed via `.env` in the root directory. Copy the sample:

```bash
cp .env.example .env
```

Key environment variables:
```dotenv
POSTGRES_DB=consentcare
POSTGRES_USER=consentcare
POSTGRES_PASSWORD=consentcare
POSTGRES_PORT=5432

CORE_SERVICE_PORT=8080
RISK_SERVICE_PORT=8001
AGENT_SERVICE_PORT=8002
FRONTEND_PORT=3000

ADMIN_EMAIL=admin@consentcare.local
ADMIN_PASSWORD=Admin@12345
ADMIN_NAME=ConsentCare System Administrator

JWT_SECRET=consentcare-super-secret-jwt-token-key-change-in-production-min-32-chars
JWT_EXPIRATION_MS=86400000
```

---

## 3. Launching the Entire System

To build and start all containers with live dependency health checks:

```bash
# Build and start all services in detached mode
docker compose up --build -d
```

### Checking Status and Health

```bash
docker compose ps
```

All 5 services should report status `Up (healthy)`.

### Viewing Logs

```bash
# Tail all logs
docker compose logs -f

# Tail a specific service
docker compose logs -f core-service
docker compose logs -f risk-service
docker compose logs -f agent-service
```

---

## 4. Port Collision & Network Prevention Rules

- All inter-service communications use Docker internal service names (`postgres`, `core-service`, `risk-service`, `agent-service`), eliminating host port binding dependencies.
- Frontend container runs on port 80 internally and maps to host port 3000 (`3000:80`).
- Container names are explicitly scoped with `consentcare-` prefixes to prevent naming collisions with external containers on the host machine.
- File uploads are persisted in named volume `consentcare_uploads`.
- Database files are persisted in named volume `consentcare_pgdata`.

---

## 5. Shutting Down or Resetting

```bash
# Stop containers
docker compose down

# Complete wipe (removes volumes and database data for clean re-initialization)
docker compose down -v
```

