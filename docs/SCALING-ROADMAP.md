# Phoxtra Cloud — Capacity Scaling & Multi-Product Hosting Roadmap

This document clarifies how capacity scaling works in Phoxtra Cloud and outlines the step-by-step roadmap for hosting multiple products on self-hosted Appwrite without losing data.

---

## 1. Capacity Scaling Clarification: Do You Need to Start Afresh?

> [!IMPORTANT]
> **NO, you NEVER need to start afresh or lose data when scaling capacity.**
> All platform data (databases, tables, user auth, files, and project settings) is stored on persistent volumes (`mariadb-data` / `phoxtra_db_data` on Fly.io).

### How In-Place Scaling Works (Zero Data Loss)
- **Scaling RAM / CPU**: Increasing VM memory (e.g. from 1GB to 2GB or 4GB) only updates the virtual machine resources. Fly.io / Docker simply restarts the container with more RAM allocated.
- **Scaling Disk Capacity**: Volume expansion (e.g. `fly vol extend phoxtra_db_data -s 10`) expands the underlying disk filesystem **online without wiping existing data**.
- **MariaDB Config Auto-Tuning**: When RAM is upgraded, updating `--innodb-buffer-pool-size` (e.g. from 256M to 1GB) allows MariaDB to immediately utilize the extra memory for higher speed and concurrency.

---

## 2. Multi-Product Hosting Architecture

Self-hosted Appwrite is natively multi-tenant:
- **One Appwrite Instance** can host **multiple Projects/Products**.
- Each product gets its own:
  - Project ID & Secret Keys
  - Database(s) & Collections
  - User Authentication & Sessions
  - File Storage Buckets
  - Cloud Functions

```text
               ┌──────────────────────────────────────────┐
               │    Phoxtra Cloud Engine (Appwrite)       │
               └────────────────────┬─────────────────────┘
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       ▼                            ▼                            ▼
┌──────────────┐             ┌──────────────┐             ┌──────────────┐
│  Product A   │             │  Product B   │             │  Product C   │
│ (e.g. SaaS)  │             │ (e.g. Mobile)│             │ (e.g. Admin) │
├──────────────┤             ├──────────────┤             ├──────────────┤
│ - DB: db_saas│             │ - DB: db_app │             │ - DB: db_adm │
│ - Users: 10k │             │ - Users: 5k  │             │ - Users: 100 │
│ - Storage A  │             │ - Storage B  │             │ - Storage C  │
└──────────────┘             └──────────────┘             └──────────────┘
```

---

## 3. Multi-Product Scaling Roadmap

### Phase 1: Current Baseline (1GB RAM / 1GB Disk)
- **Target Use Case**: Initial platform setup, operational testing, 1 light product or MVP.
- **MariaDB Config**: `--innodb-buffer-pool-size=256M`, `--max-allowed-packet=64M`.
- **Appwrite Storage Limit**: 1GB (`_APP_STORAGE_LIMIT=1073741824`).
- **Action Required**: Test and launch initial product features.

### Phase 2: Growth Tier (2GB - 4GB RAM / 10GB - 20GB Disk)
- **Trigger**: Launching 2–3 products, or database storage reaching 70% capacity.
- **In-Place Scaling Steps**:
  1. Expand Database Volume:
     ```bash
     fly vol extend phoxtra_db_data -s 10 -a phoxtra-db
     ```
  2. Scale Database RAM to 2GB / 4GB:
     ```bash
     fly scale memory 2048 -a phoxtra-db
     ```
  3. Tune MariaDB config in `configs/fly.db.toml`:
     `--innodb-buffer-pool-size=1024M`
- **Result**: Zero data loss, 4x faster database query response times.

### Phase 3: Multi-Product Production Scale (8GB+ RAM / Managed S3 Storage)
- **Trigger**: High user traffic, multi-product production scaling.
- **Architecture Upgrades**:
  1. Offload heavy media/file uploads to S3 / Cloudflare R2 (`_APP_STORAGE_DEVICE=s3`).
  2. Separate Redis caching & Appwrite Cloud Functions.
  3. Enable automated MariaDB snapshot backups via `scripts/backup.ps1`.

---

## Summary Checklist for Adding New Products

When adding a new product to your existing setup:
1. Log into your Appwrite Console.
2. Click **Create Project** -> Name your new product (e.g., "Product B").
3. Create dedicated Databases, Collections, and Storage Buckets within that project.
4. Scale up RAM/Storage seamlessly whenever product traffic or storage requirements increase.
