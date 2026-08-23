# Phoxtra Cloud Infrastructure

Repository for managing self-hosting infrastructure definitions, deployment configurations, and operational assets for **Phoxtra Cloud**.

## Architecture (Phase 2 Gateway & Networking)

```text
Client / Internet
       │
       ▼
phoxtra-cloud-gateway (Caddy 2.9 — Ports 80 & 443)
       │
       ▼ (phoxtra-net Bridge Network)
phoxtra-cloud-appwrite (Internal Port 80)
   ┌───┴───┐
   ▼       ▼
MariaDB   Redis
```

- **Reverse Proxy Gateway**: Caddy (`phoxtra-cloud-gateway`) is the sole public ingress point on host ports `80` and `443`.
- **Service Isolation**: Appwrite, MariaDB 10.11, and Redis 7 Alpine communicate exclusively over an isolated internal bridge network (`phoxtra-net`) with zero public host port exposure for database/cache layers.
- **TLS Strategy**: Internal self-signed TLS engine for local development (`cloud.phoxtra.localhost` / `localhost`) and automated ACME / Let's Encrypt for production (`cloud.phoxtra.com`).

## Repository Layout

- `appwrite/`: Appwrite backend engine configuration templates.
- `backups/`: Target storage directory for database dumps and snapshots (ignored by Git).
- `configs/`: Service configuration files (`Caddyfile`, `fly.cloud.toml`, `fly.db.toml`).
- `docker/`: Production Docker Compose definition (`docker/docker-compose.yml`) and `Dockerfile`.
- `docs/`: Comprehensive infrastructure inventory, gateway architecture, TLS runbook, and recovery runbooks.
- `logs/`: Runtime log directory (ignored by Git).
- `monitoring/`: Configuration definitions for platform monitoring.
- `scripts/`: Operational automation scripts (`setup.ps1`, `backup.ps1`, `healthcheck.ps1`).
- `ssl/`: TLS certificate storage (private key material ignored by Git).

## Documentation Index

- [`docs/INFRASTRUCTURE-INVENTORY.md`](docs/INFRASTRUCTURE-INVENTORY.md): Comprehensive inventory of configurations, volume structures, and deployment specifications.
- [`docs/GATEWAY-ARCHITECTURE.md`](docs/GATEWAY-ARCHITECTURE.md): Gateway topology, Caddy proxy specifications, and port isolation rules.
- [`docs/TLS-RUNBOOK.md`](docs/TLS-RUNBOOK.md): Local development TLS strategy, production ACME workflow, and certificate safety.
- [`docs/RECOVERY-RUNBOOK.md`](docs/RECOVERY-RUNBOOK.md): Step-by-step disaster recovery instructions.
