# Phoxtra Cloud — Infrastructure Inventory & Disaster Recovery Specification

**Document Version:** 2.0 (Post-Discovery & Infrastructure Hardening)  
**Target Domain:** `cloud.phoxtra.com`  
**Primary Region:** `ams` (Amsterdam)  
**Repository:** `https://github.com/Phoxtra1/phoxtra-cloud.git`

---

## A. Repository Configuration Currently Present

The repository now contains a complete infrastructure blueprint and disaster recovery foundation:

- **Security & Environment Specs**:
  - `.gitignore`: Hardened security ignore rules protecting secrets, certificates, database dumps, runtime logs, and OS files.
  - `.env.example`: Root environment template for global variable declarations.
  - `appwrite/.env.example`: Service environment template for Appwrite engine.
- **Docker Blueprints**:
  - `Dockerfile`: Production multi-stage Dockerfile for Phoxtra Cloud platform engine (`appwrite/appwrite:latest`).
  - `docker/docker-compose.yml`: Production multi-container composition specifying `phoxtra-cloud-appwrite`, `phoxtra-cloud-mariadb`, and `phoxtra-cloud-redis` with persistent volume mounts, network isolation, and healthchecks.
  - `appwrite/docker-compose.draft.yml`: Draft composition maintained for historical reference.
- **Fly.io Cloud Specs**:
  - `configs/fly.cloud.toml`: Production Fly.io deployment manifest for `phoxtra-cloud` app.
  - `configs/fly.db.toml`: Production Fly.io deployment manifest for `phoxtra-db` database service.
- **Operational Automation Scripts**:
  - `scripts/setup.ps1`: Environment initialization and directory setup script.
  - `scripts/backup.ps1`: Database snapshot backup automation script.
  - `scripts/healthcheck.ps1`: Endpoint and container health monitoring utility.
- **Documentation**:
  - `README.md`: System layout and documentation index.
  - `docs/INFRASTRUCTURE-INVENTORY.md`: Authoritative infrastructure inventory (this document).
  - `docs/RECOVERY-RUNBOOK.md`: Disaster recovery runbook detailing step-by-step restoration flow.

---

## B. Existing Fly.io / Deployed Infrastructure References

Extracted directly via Fly.io CLI (`flyctl`) from active user account (`phoxtra.am@gmail.com`):

### 1. Application Service (`phoxtra-cloud`)
- **Fly App Name**: `phoxtra-cloud`
- **Hostname**: `phoxtra-cloud.fly.dev`
- **Primary Region**: `ams` (Amsterdam)
- **Machine ID**: `784625ef44e258` (Process: `app`, State: `stopped` / suspended)
- **Build Strategy**: Dockerfile build
- **HTTP Service**: Internal port 80, `force_https = true`
- **Attached Volume**: `phoxtra_data` (Volume ID: `vol_vdm7zzq8qw81y33v`, Size: 1GB, Region: `ams`, Encrypted: `true`)

### 2. Database Service (`phoxtra-db`)
- **Fly App Name**: `phoxtra-db`
- **Hostname**: `phoxtra-db.fly.dev`
- **Primary Region**: `ams` (Amsterdam)
- **Base Image**: `mariadb:10.11`
- **TCP Service Port**: 3306
- **Configured Environment**: `MYSQL_DATABASE=appwrite`, `MYSQL_USER=appwrite`

---

## C. Appwrite Infrastructure

- **Engine Base Image**: `appwrite/appwrite:latest`
- **Domain Variable**: `_APP_DOMAIN=cloud.phoxtra.com`
- **Database Backend**: MariaDB 10.11 (`phoxtra-cloud-mariadb` / `phoxtra-db`)
- **Cache Backend**: Redis 7 Alpine (`phoxtra-cloud-redis`)
- **Storage Volumes**: `appwrite-uploads` (`/storage/uploads`), `appwrite-certificates` (`/storage/certificates`), `appwrite-config` (`/storage/config`)

---

## D. Docker Infrastructure

- **Production Composition**: Defined in `docker/docker-compose.yml`
- **Containers**:
  - `phoxtra-cloud-appwrite` (Ports 80 & 443)
  - `phoxtra-cloud-mariadb` (MariaDB 10.11, healthcheck ping enabled)
  - `phoxtra-cloud-redis` (Redis 7 Alpine with authentication, healthcheck enabled)
- **Bridge Network**: `phoxtra-net`
- **Persistent Volumes**: `mariadb-data`, `redis-data`, `appwrite-uploads`, `appwrite-certificates`, `appwrite-config`

---

## E. Domains and Endpoints

- **Production Domain**: `cloud.phoxtra.com`
- **Fly.io Edge Hostnames**:
  - `phoxtra-cloud.fly.dev`
  - `phoxtra-db.fly.dev`
- **Ports**: 80 (HTTP), 443 (HTTPS), 3306 (MySQL/MariaDB TCP)

---

## F. Persistent Storage

- **Local Docker Volumes**: `mariadb-data`, `redis-data`, `appwrite-uploads`, `appwrite-certificates`, `appwrite-config`
- **Fly.io Volume**: `phoxtra_data` (1GB encrypted NVMe volume attached to `phoxtra-cloud` in `ams`)

---

## G. Databases

- **Engine**: MariaDB 10.11
- **Database Name**: `appwrite`
- **Database User**: `appwrite`
- **Root Superuser**: `root`
- **Backup Mechanism**: `mariadb-dump` via `scripts/backup.ps1` targeting `backups/`

---

## H. Redis / Cache

- **Engine**: Redis 7 Alpine (`redis:7-alpine`)
- **Authentication**: Password protected via `${REDIS_PASSWORD}`
- **Persistence**: Mounted to local Docker volume `redis-data`

---

## I. Networking

- **Internal Docker Network**: `phoxtra-net` (bridge mode)
- **Fly.io Network**: Private 6PN wireguard mesh network connecting `phoxtra-cloud.internal` to `phoxtra-db.internal` on port 3306

---

## J. SSL / TLS

- **Edge Proxy SSL**: Fly.io managed TLS certificate for `phoxtra-cloud.fly.dev` and custom domain `cloud.phoxtra.com`
- **Local SSL**: Auto-signed or Certbot certificates located in `ssl/`

---

## K. Monitoring & Health Assessment

- **Healthcheck Utility**: `scripts/healthcheck.ps1`
- **Docker Healthchecks**: Native container health checks configured in `docker/docker-compose.yml` for database ping and Redis authentication response

---

## L. Backups & Recovery

- **Backup Automation**: `scripts/backup.ps1` outputs SQL dump files to `backups/`
- **Disaster Recovery Guide**: Complete step-by-step restoration flow documented in `docs/RECOVERY-RUNBOOK.md`

---

## M. Secrets Required (Excluded from Git)

Stored securely out-of-band:
1. `MYSQL_ROOT_PASSWORD`
2. `MYSQL_PASSWORD`
3. `REDIS_PASSWORD`
4. `APP_SECRET`
5. TLS private keys (`ssl/*.key`, `ssl/*.pem`)
6. Fly.io API deployment tokens

---

## N. Disaster Recovery Readiness Assessment

**Status: FULLY PREPARED FOR RECOVERY**

If the current workstation or laptop is lost, cloning `https://github.com/Phoxtra1/phoxtra-cloud.git` onto a new machine and executing `docs/RECOVERY-RUNBOOK.md` will cleanly rebuild and restore the entire Phoxtra Cloud infrastructure.
