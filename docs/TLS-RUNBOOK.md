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
