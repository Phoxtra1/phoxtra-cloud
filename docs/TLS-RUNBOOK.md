# Phoxtra Cloud — TLS & Security Runbook

**Scope:** Local Development TLS, Production ACME Strategy, and Secret Management  
**Status:** Phase 2 Operational Runbook  

---

## 1. Local Development TLS Strategy

In local environments, production domain DNS (`cloud.phoxtra.com`) does not resolve to the local workstation loopback. To allow full HTTPS testing without public ACME validation failures or committing private keys, Phoxtra Cloud uses Caddy's native **Internal TLS Engine**.

### Local Hostnames Supported
- `cloud.phoxtra.localhost`
- `localhost`
- `127.0.0.1`

### How Caddy Internal TLS Works
1. Caddy acts as an internal Certificate Authority (CA) running in `phoxtra-cloud-gateway`.
2. When a request hits `https://cloud.phoxtra.localhost` or `https://localhost`, Caddy dynamically issues a local self-signed TLS certificate.
3. Local HTTP client requests (`curl.exe -k` or browser accepting internal CA) establish encrypted TLS connections directly to the gateway.

---

## 2. Production TLS Strategy (`cloud.phoxtra.com`)

When deploying Phoxtra Cloud to a public production server:
1. Ensure `cloud.phoxtra.com` A/AAAA DNS records point directly to the host public IP.
2. Ensure host firewall permits inbound traffic on ports `80` and `443`.
3. Caddy automatically connects to Let's Encrypt / ZeroSSL ACME servers via HTTP-01 / TLS-ALPN-01 challenges and issues production certificates seamlessly.
4. Certificates and private keys are stored securely inside the `caddy-data` volume (`/data/caddy/certificates`) and are **never exposed to Git**.

---

## 3. Secret & Certificate Exclusion Rules

To maintain strict security, the repository `.gitignore` explicitly excludes all private keys, certificates, secrets, and runtime data:

```gitignore
# Appwrite & Environment Secrets
.env
.env.*
!.env.example

# SSL & Security Credentials
*.key
*.pem
*.pfx
*.p12
*.crt
ssl/*
!ssl/.gitkeep

# Backup Dumps & Archives
backups/*
!backups/.gitkeep

# Logs
logs/*
!logs/.gitkeep
```

---

## 4. Verification & Audit Commands

To verify that local TLS and secrets protection are operational:

```powershell
# 1. Verify secrets and certificates are ignored by Git
git status --short --ignored

# 2. Test HTTP -> HTTPS redirection
curl.exe -k -I http://localhost

# 3. Test local HTTPS endpoint
curl.exe -k -I https://localhost
curl.exe -k -I https://cloud.phoxtra.localhost
```

---

## 5. Troubleshooting SSL Errors During Machine Scaling / Restarts

### Why SSL Errors Occur During RAM/Capacity Upgrades
1. **Transient Warm-Up Window (5-15s)**: When scaling RAM (`fly scale memory 2048`), Fly.io stops and restarts machine containers. During the 5-15 second boot period, Fly's edge proxy receives HTTPS requests before internal Caddy/Swoole servers finish booting, returning temporary SSL handshake failures (`ERR_SSL_PROTOCOL_ERROR` or `ECONNRESET`).
2. **ACME Rate Limits**: If Caddy restarts multiple times without persistent volume mounts (`caddy-data`), Let's Encrypt enforces a limit of 5 certificate renewals per week, causing Caddy to temporarily issue untrusted fallback certificates.

### Prevention & Recovery Procedure
1. **Persist Caddy Storage**: Ensure `caddy-data` volume is mounted in Docker / Fly.io manifests so issued ACME certificates persist across container scale operations.
2. **Post-Scaling Wait**: Allow 15-20 seconds after scaling commands complete for health checks to pass before visiting `https://cloud.phoxtra.com`.
3. **Force Certificate Renewal (if rate-limited)**:
   ```bash
   caddy reload --config /etc/caddy/Caddyfile
   ```

