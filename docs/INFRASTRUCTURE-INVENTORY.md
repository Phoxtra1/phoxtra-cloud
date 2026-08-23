# Phoxtra Cloud — Infrastructure Inventory & Disaster Recovery Specification

**Document Version:** 3.0 (Phase 2 Gateway, TLS & Network Hardening)
**Target Domain:** `cloud.phoxtra.com`
**Local Test Hostname:** `cloud.phoxtra.localhost`
**Primary Region:** `ams` (Amsterdam)
**Repository:** `https://github.com/Phoxtra1/phoxtra-cloud.git`

---

## A. Repository Configuration Currently Present

- **Security & Environment Specs**:
  - `.gitignore`: Hardened security rules ignoring secrets, certificates, database dumps, logs, and OS files.
  - `.env.example`: Root environment template for global variable declarations.
  - `appwrite/.env.example`: Service environment template for Appwrite engine.
- **Gateway & Proxy Specs**:
  - `configs/Caddyfile`: Reverse proxy configuration handling local internal TLS (`cloud.phoxtra.localhost` / `localhost`) and production ACME blueprint (`cloud.phoxtra.com`).
- **Docker Blueprints**:
  - `Dockerfile`: Multi-stage Dockerfile for Phoxtra Cloud platform engine (`appwrite/appwrite:latest`).
  - `docker/docker-compose.yml`: Production multi-container composition specifying `phoxtra-cloud-gateway`, `phoxtra-cloud-appwrite`, `phoxtra-cloud-mariadb`, and `phoxtra-cloud-redis` with persistent volumes, network isolation, and healthchecks.
- **Fly.io Deployment Specs**:
  - `configs/fly.cloud.toml`: Production Fly.io deployment manifest for `phoxtra-cloud` app.
  - `configs/fly.db.toml`: Production Fly.io deployment manifest for `phoxtra-db` database service.
- **Operational Automation Scripts**:
  - `scripts/setup.ps1`: Environment initialization and directory setup script.
  - `scripts/backup.ps1`: Database snapshot backup automation script.
  - `scripts/healthcheck.ps1`: Gateway and container health assessment utility.
- **Documentation**:
  - `README.md`: System layout and documentation index.
  - `docs/INFRASTRUCTURE-INVENTORY.md`: Authoritative infrastructure inventory (this document).
  - `docs/GATEWAY-ARCHITECTURE.md`: Reverse proxy gateway topology and port exposure policy.
  - `docs/TLS-RUNBOOK.md`: Local self-signed TLS strategy and production ACME guide.
  - `docs/RECOVERY-RUNBOOK.md`: Disaster recovery runbook detailing step-by-step restoration flow.

---

## B. Existing Fly.io / Deployed Infrastructure References (Read-Only)

Discovered directly via Fly.io CLI (`flyctl`) from active user account (`phoxtra.am@gmail.com`):

### 1. Application Service (`phoxtra-cloud`)
- **Fly App Name**: `phoxtra-cloud`
- **Hostname**: `phoxtra-cloud.fly.dev`
- **Primary Region**: `ams` (Amsterdam)
- **Machine ID**: `784625ef44e258` (State: `stopped` / suspended)
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

## C. Gateway & Docker Infrastructure

- **Gateway Service**: `phoxtra-cloud-gateway` (`caddy:2.9-alpine`)
  - Ports bound to host: `80:80` (HTTP) and `443:443` (HTTPS).
  - Serves as the sole public ingress point.
- **Appwrite Core Service**: `phoxtra-cloud-appwrite` (`appwrite/appwrite:latest`)
  - Internal port 80 on `phoxtra-net`. Zero host ports bound.
- **Database Service**: `phoxtra-cloud-mariadb` (`mariadb:10.11`)
  - Internal port 3306 on `phoxtra-net`. Zero host ports bound.
- **Cache Service**: `phoxtra-cloud-redis` (`redis:7-alpine`)
  - Internal port 6379 on `phoxtra-net`. Zero host ports bound.
- **Bridge Network**: `phoxtra-net` (`172.18.0.0/16`)

---

## D. Persistent Storage Volumes

1. **`mariadb-data`**: Persistent database data (`/var/lib/mysql`).
2. **`redis-data`**: Persistent Redis cache data (`/data`).
3. **`appwrite-uploads`**: Appwrite user files & attachments (`/storage/uploads`).
4. **`appwrite-certificates`**: Appwrite SSL storage (`/storage/certificates`).
5. **`appwrite-config`**: Appwrite internal settings (`/storage/config`).
6. **`caddy-data`**: Caddy TLS state & internal CA data (`/data`).
7. **`caddy-config`**: Caddy dynamic configuration (`/config`).

---

## E. Domains and Endpoints

- **Production Domain**: `cloud.phoxtra.com`
- **Local Testing Domain**: `cloud.phoxtra.localhost` / `localhost`
- **Public Ports**: 80 (HTTP redirect) and 443 (HTTPS Gateway)

---

## F. Secrets Required (Excluded from Git)

Stored securely out-of-band:
1. `MYSQL_ROOT_PASSWORD`
2. `MYSQL_PASSWORD`
3. `REDIS_PASSWORD`
4. `APP_SECRET`
5. TLS private keys (`ssl/*.key`, `ssl/*.pem`)
6. Fly.io API deployment tokens

---

## G. Disaster Recovery Readiness Assessment

**Status: FULLY PREPARED FOR RECOVERY WITH GATEWAY**

Cloning `https://github.com/Phoxtra1/phoxtra-cloud.git` onto a new machine and executing `docs/RECOVERY-RUNBOOK.md` will cleanly restore the complete Phoxtra Cloud gateway, application core, and database stack.
