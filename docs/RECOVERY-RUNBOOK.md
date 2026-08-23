# Phoxtra Cloud — Disaster Recovery Runbook

**Target Goal:** Recover full Phoxtra Cloud self-hosted infrastructure with Caddy Gateway on a fresh machine or server after loss of previous environment.

---

## 1. Prerequisites

Before starting recovery, ensure the new host system has installed:
- **Git**: `git --version`
- **Docker Desktop / Docker Engine**: `docker --version`
- **Fly.io CLI (`flyctl`)**: `flyctl version` (Installed at `%USERPROFILE%\.fly\bin\flyctl.exe` on Windows)

---

## 2. Step-by-Step Recovery Procedure

### Step 1: Clone Infrastructure Repository
Clone the authoritative source-controlled infrastructure repository:
```bash
git clone https://github.com/Phoxtra1/phoxtra-cloud.git
cd phoxtra-cloud
```

### Step 2: Environment & Directory Initialization
Run the initialization script to prepare structural directories and generate initial environment files:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
```
*(On Linux/macOS, copy templates manually: `cp .env.example .env` and `cp appwrite/.env.example appwrite/.env`)*

### Step 3: Secret Ingestion (Out-of-Band Secret Restoration)
Edit `.env` and inject the actual production credentials retrieved from your secure password vault:
- `MYSQL_ROOT_PASSWORD`
- `MYSQL_PASSWORD`
- `REDIS_PASSWORD`
- `APP_SECRET`

### Step 4: Local Docker Multi-Container Launch
Bring up the multi-container production infrastructure stack:
```bash
docker compose --env-file .env -f docker/docker-compose.yml up -d
```
Verify container status:
```bash
docker compose --env-file .env -f docker/docker-compose.yml ps
```

### Step 5: Database Data Restoration
If recovering from a database backup archive in `backups/`:
```powershell
docker exec -i phoxtra-cloud-mariadb mariadb -u root -p<YOUR_ROOT_PASSWORD> < backups/phoxtra-db-dump-TIMESTAMP.sql
```

### Step 6: System Health & Gateway Verification
Run the automated system health check utility to verify container health and local gateway routing:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\healthcheck.ps1
```

Or verify manually via `curl.exe`:
```powershell
# Test HTTP -> HTTPS 308 Redirect
curl.exe -k -I http://localhost

# Test HTTPS Gateway -> Appwrite Route
curl.exe -k -I https://localhost
curl.exe -k -I https://cloud.phoxtra.localhost
```

---

## 3. Recovery Verification Checklist

- [ ] All Docker containers (`phoxtra-cloud-gateway`, `phoxtra-cloud-appwrite`, `phoxtra-cloud-mariadb`, `phoxtra-cloud-redis`) report `healthy` or `running` state.
- [ ] Only `phoxtra-cloud-gateway` binds host ports `80` and `443`.
- [ ] Database schema and tables populated cleanly without errors.
- [ ] Redis cache responds to ping on port 6379 internally.
- [ ] `http://localhost` returns `308 Permanent Redirect` to `https://localhost/`.
- [ ] `https://localhost` and `https://cloud.phoxtra.localhost` return Appwrite application responses forwarded through Caddy.
