# Phoxtra Cloud — Disaster Recovery Runbook

**Target Goal:** Recover full Phoxtra Cloud self-hosted infrastructure on a fresh machine or server after loss of previous environment.

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
.\scripts\setup.ps1
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
docker compose -f docker/docker-compose.yml up -d
```
Verify container status:
```bash
docker compose -f docker/docker-compose.yml ps
```

### Step 5: Database Data Restoration
If recovering from a database backup archive in `backups/`:
```powershell
docker exec -i phoxtra-cloud-mariadb mariadb -u root -p<YOUR_ROOT_PASSWORD> < backups/phoxtra-db-dump-TIMESTAMP.sql
```

### Step 6: Fly.io Cloud Environment Resumption
If resuming the Fly.io cloud deployment:
1. Authenticate Fly CLI:
   ```powershell
   & "$ENV:USERPROFILE\.fly\bin\flyctl.exe" auth login
   ```
2. Resume suspended apps:
   ```powershell
   & "$ENV:USERPROFILE\.fly\bin\flyctl.exe" machine start --app phoxtra-cloud 784625ef44e258
   ```
3. Deploy updated configuration if necessary:
   ```powershell
   & "$ENV:USERPROFILE\.fly\bin\flyctl.exe" deploy -c configs/fly.cloud.toml
   ```

### Step 7: System Health Verification
Run the automated system health check utility to verify container health, cloud status, and endpoints:
```powershell
.\scripts\healthcheck.ps1
```
---

## 3. Recovery Verification Checklist

- [ ] All Docker containers (`phoxtra-cloud-appwrite`, `phoxtra-cloud-mariadb`, `phoxtra-cloud-redis`) report `healthy` state.
- [ ] Database schema and tables populated cleanly without errors.
- [ ] Redis cache responds to ping on port 6379.
- [ ] `https://cloud.phoxtra.com` and `https://phoxtra-cloud.fly.dev` respond to HTTP requests.
