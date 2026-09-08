# Phoxtra Cloud — Pre-Migration Lockdown & Readiness Guide

Use this checklist to verify that your Phoxtra Cloud infrastructure is fully locked down and ready before starting your data migration into Appwrite.

---

## 1. Pre-Migration Security & Configuration Audit

- [x] **MariaDB Packet & Buffer Tuning**:
  - `max_allowed_packet = 64M` (Prevents connection drops on large payload imports).
  - `innodb_buffer_pool_size = 256M` (Optimized for 1GB RAM; expandable to `1024M` on 2GB RAM).
  - `max_connections = 100`.
  - Enforced `utf8mb4` character encoding.
- [x] **SSL & Caddy Gateway Persistence**:
  - `caddy-data` volume mounted for persistent ACME certificate storage across machine restarts.
  - Reverse proxy headers (`X-Forwarded-Proto`, `Host`, `X-Forwarded-Host`) enabled.
- [x] **Appwrite Payload Limits**:
  - `_APP_STORAGE_LIMIT=1073741824` (1GB storage capacity limit).
  - Console whitelist fallback configured to prevent 403 authorization locks.

---

## 2. Recommended Migration Workflow

Follow these steps to migrate data safely into Appwrite:

### Step 1: Take a Pre-Migration Backup Snapshot
Before importing data, create a clean restore point:
```powershell
# For local Docker setup:
.\scripts\backup.ps1

# For Fly.io production setup:
flyctl ssh console -a phoxtra-db --command "mariadb-dump -u root -p<ROOT_PASSWORD> --all-databases > /var/lib/mysql/pre-migration-backup.sql"
```

### Step 2: Prepare Target Appwrite Project & API Key
1. Log into **Appwrite Console** -> Create your target Project.
2. Go to **Overview** -> **API Keys** -> Create an API Key with `databases.read`, `databases.write`, `collections.read`, and `collections.write` scopes.

### Step 3: Run the Automated Migration Script
Use the built-in zero-dependency migration utility:
```powershell
$env:SUPABASE_URL="https://<your-supabase-project>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<your-supabase-service-role-key>"
$env:APPWRITE_ENDPOINT="https://cloud.phoxtra.com/v1"
$env:APPWRITE_PROJECT_ID="<your-project-id>"
$env:APPWRITE_API_KEY="<your-api-key>"

node scripts/supabase-to-appwrite.js <table1> <table2> <table3>
```

---

## 3. Disaster Recovery & Rollback Procedure

If a migration fails or encounters corrupt source data:
1. Re-run database restore from pre-migration backup.
2. Adjust attribute sizing or data batch size.
3. Re-run migration script for target table.
