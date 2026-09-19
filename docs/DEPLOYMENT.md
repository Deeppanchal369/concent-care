# ConsentCare EHR — Production Deployment & Operational Guide

This document outlines the deployment architecture, configuration, containerization, and operational procedures for running the ConsentCare Electronic Health Record (EHR) system in a production or staged research environment.

---

## 1. Deployment Architecture

ConsentCare is architected as a modular, containerized multi-tier system:

```
[ External Internet / Hospital LAN ]
               │
               ▼ HTTPS (Port 443 / Reverse Proxy)
┌─────────────────────────────────────────────────────────────────┐
│ DMZ Tier                                                        │
│   • consentcare-prod-frontend (Nginx Alpine, Static SPA Chunks) │
│   • consentcare-prod-core-service (Spring Boot REST / SSE)      │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼ Internal Private Network (internal: true)
┌────────────────┴────────────────────────────────────────────────┐
│ Internal Service Tier (Zero Public / Host Port Exposure)        │
│   • consentcare-prod-postgres (PostgreSQL 16, Flyway V1-V17)    │
│   • consentcare-prod-risk-service (FastAPI, UCI Random Forest)  │
│   • consentcare-prod-agent-service (FastAPI, Ollama Bridge)     │
└─────────────────────────────────────────────────────────────────┘
                 │
                 ▼ Host Bridge (127.0.0.1:11434)
┌────────────────┴────────────────────────────────────────────────┐
│ Host Machine / On-Premises Hardware                             │
│   • Local Ollama Daemon (llama3.2:1b weights)                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Deployment Configurations: Development vs Production

| Dimension | Development (`docker-compose.yml`) | Production (`docker-compose.prod.yml`) |
|---|---|---|
| **PostgreSQL Port** | Published to host (`0.0.0.0:5433->5432`) for dev inspection | `expose: ["5432"]` (Strictly internal network only) |
| **Risk Service Port** | Bound to loopback (`127.0.0.1:8001->8001`) | `expose: ["8001"]` (Strictly internal network only) |
| **Agent Service Port** | Bound to loopback (`127.0.0.1:8002->8002`) | `expose: ["8002"]` (Strictly internal network only) |
| **Core Service Port** | Published to `8081` | Published to standard `8080` or reverse proxy |
| **Frontend Port** | Published to `81` | Published to standard `80` (or `443` via TLS proxy) |
| **Restart Policy** | `unless-stopped` | `always` |
| **Logging Driver** | Docker default | `json-file` with size limits (`10m`–`50m`, max 3–5 files) |
| **Network Isolation** | Single default bridge network | Tiered networks (`dmz_net` and `internal_net`) |

---

## 3. Standard Production Deployment Procedure

### 3.1 Step 1: System Preparation
Ensure Docker Engine 26+ and Docker Compose v2+ are installed:
```bash
docker --version
docker compose version
```

### 3.2 Step 2: Initialize Local Ollama (On Host)
1. Start Ollama on the host:
   ```bash
   ollama serve
   ```
2. Pull the required clinical model:
   ```bash
   ollama pull llama3.2:1b
   ```
3. Test local availability:
   ```bash
   curl http://localhost:11434/api/tags
   ```

### 3.3 Step 3: Configure Production Secrets
Create a production `.env` file from the template:
```bash
cp .env.example .env
```
Generate cryptographic secrets for production:
```bash
# Generate 64-character JWT secret
openssl rand -base64 48

# Generate secure PostgreSQL password
openssl rand -hex 16
```
Update `.env`:
```env
POSTGRES_DB=consentcare
POSTGRES_USER=consentcare_app
POSTGRES_PASSWORD=<secure-password>
JWT_SECRET=<generated-64-char-secret>
ADMIN_EMAIL=admin@hospital.org
ADMIN_PASSWORD=<secure-admin-password>
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=llama3.2:1b
```

### 3.4 Step 4: Build and Launch Containers
```bash
# Build production images
docker compose -f docker-compose.prod.yml --env-file .env build

# Launch daemonized containers
docker compose -f docker-compose.prod.yml --env-file .env up -d
```

### 3.5 Step 5: Verification & Health Check
```bash
docker compose -f docker-compose.prod.yml ps
```
Inspect logs to ensure clean initialization:
```bash
docker compose -f docker-compose.prod.yml logs -f core-service
```

---

## 4. Database Persistence & Backup Management

### 4.1 Storage Volumes
Production volumes are defined with explicit naming to prevent data loss:
* `consentcare_prod_pgdata`: Persistent PostgreSQL data directory (`/var/lib/postgresql/data`).
* `consentcare_prod_uploads`: Persistent medical document storage sandbox (`/app/uploads`).

### 4.2 Database Backup (`pg_dump`)
Execute automated, non-locking logical backups:
```bash
# Export compressed binary backup
docker exec -t consentcare-prod-postgres pg_dump -U consentcare_app -d consentcare -F c -b -v -f /var/lib/postgresql/data/backup_$(date +%Y%m%d_%H%M%S).dump

# Copy backup to secure off-site archive
docker cp consentcare-prod-postgres:/var/lib/postgresql/data/backup_*.dump /secure/backup/destination/
```

### 4.3 Database Restore (`pg_restore`)
```bash
# Drop active connections and restore
docker exec -i consentcare-prod-postgres pg_restore -U consentcare_app -d consentcare --clean --if-exists -v < /secure/backup/destination/backup_file.dump
```

---

## 5. Reverse Proxy & TLS/HTTPS Hardening

For clinical deployments accessible across the hospital network or internet, deploy an Nginx or Traefik reverse proxy in front of the DMZ tier:

```nginx
# Sample Nginx TLS Configuration
server {
    listen 443 ssl http2;
    server_name ehr.hospital.org;

    ssl_certificate /etc/ssl/certs/ehr_hospital_org.crt;
    ssl_certificate_key /etc/ssl/private/ehr_hospital_org.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # SPA Frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Core REST & SSE API
    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        # SSE Streaming support
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
    }
}
```

---

## 6. Zero Cloud Dependency & Offline Air-Gap Mode

ConsentCare is fully capable of operating in air-gapped environments without external internet connectivity:
1. Docker images can be saved and transferred via `docker save` / `docker load`.
2. Ollama weights for `llama3.2:1b` (1.3 GB) run 100% locally on CPU/GPU.
3. The UCI Diabetes Random Forest model (`readmission_model.joblib`) is packaged directly inside the `risk-service` image.
4. Tesseract OCR language packages (`tesseract-ocr-eng`) are bundled at build time.
5. All database migrations are packaged inside `core-service-1.0.0.jar`.
