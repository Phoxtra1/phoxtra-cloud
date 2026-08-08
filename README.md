# Phoxtra Cloud Infrastructure

Repository for managing the self-hosting infrastructure definitions, deployment configurations, and operational assets for **Phoxtra Cloud**.

## Directory Structure

- `appwrite/`: Appwrite backend engine configuration and docker compose definitions.
- `backups/`: Target storage directory for automated database dumps and snapshot backups (ignored by Git).
- `configs/`: Service configuration files for reverse proxy, databases, and microservices.
- `docker/`: Custom Dockerfiles and multi-service orchestration blueprints.
- `docs/`: System documentation, infrastructure inventory, architecture blueprints, and recovery runbooks.
- `logs/`: Runtime log storage directory (ignored by Git).
- `monitoring/`: Configuration definitions for platform monitoring, telemetry, and health checks.
- `scripts/`: Operational shell/automation scripts for deployment, backups, updates, and maintenance.
- `ssl/`: SSL/TLS certificate configuration and renewal scripts (private keys ignored by Git).

## Documentation

See [`docs/INFRASTRUCTURE-INVENTORY.md`](docs/INFRASTRUCTURE-INVENTORY.md) for the complete inventory of present configuration, deployment references, missing components, and disaster recovery specs.
