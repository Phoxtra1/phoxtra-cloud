# Phoxtra Cloud — Gateway Architecture Specification

**Component:** Production Reverse Proxy & Network Gateway Layer  
**Technology:** Caddy 2.9 (Alpine)  
**Status:** Phase 2 Local Production Implementation  

---

## 1. Overview & Architecture Diagram

In Phase 2, public host access to Phoxtra Cloud is consolidated through a dedicated **Caddy Gateway** container (`phoxtra-cloud-gateway`). Direct exposure of application services, databases, or cache engines to the host system or Internet has been removed.

```text
Internet / Client Request
        │
        ▼
   Host System
        │
┌───────┴───────────────────────────────┐
│ Public Ingress Ports (80 & 443)       │
└───────┬───────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ phoxtra-cloud-gateway (Caddy 2.9)     │
│ - HTTP:80  ──▶ 308 Redirect ──▶ HTTPS │
│ - HTTPS:443 ──▶ TLS Termination       │
└───────┬───────────────────────────────┘
        │ Internal Docker Network (phoxtra-net)
        ▼
┌───────────────────────────────────────┐
│ phoxtra-cloud-appwrite (Port 80)      │
│ Appwrite Core Web Engine              │
└───────┬───────────────┬───────────────┘
        │               │
        ▼               ▼
┌──────────────┐ ┌──────────────┐
│ phoxtra-     │ │ phoxtra-     │
│ mariadb      │ │ redis        │
│ (Port 3306)  │ │ (Port 6379)  │
└──────────────┘ └──────────────┘
```

---

## 2. Port Binding & Access Policy

| Service Container | Internal Port | Host Port Binding | Exposure Policy |
| :--- | :--- | :--- | :--- |
| `phoxtra-cloud-gateway` | 80, 443 | `80:80`, `443:443` | **PUBLIC**: Only container listening on host network interface. |
| `phoxtra-cloud-appwrite` | 80 | *None* | **INTERNAL ONLY**: Accessible only via `phoxtra-net` bridge network. |
| `phoxtra-cloud-mariadb` | 3306 | *None* | **INTERNAL ONLY**: Accessible only to Appwrite via `phoxtra-net`. |
| `phoxtra-cloud-redis` | 6379 | *None* | **INTERNAL ONLY**: Accessible only to Appwrite via `phoxtra-net`. |

---

## 3. Reverse Proxy Configuration (`configs/Caddyfile`)

Caddy operates as an edge router forwarding sanitized traffic to Appwrite:

```caddy
{
    admin off
}

# 1. Local Development Endpoints (Internal Self-Signed TLS)
cloud.phoxtra.localhost, localhost, 127.0.0.1 {
    tls internal
    reverse_proxy phoxtra-cloud-appwrite:80 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}

# 2. Production Domain Blueprint
cloud.phoxtra.com {
    reverse_proxy phoxtra-cloud-appwrite:80 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}
```

---

## 4. Key Architectural Guarantees

1. **Host Isolation**: Neither MariaDB nor Redis nor Appwrite exposes raw host ports.
2. **HTTP -> HTTPS Enforcement**: All HTTP requests arriving on port 80 are automatically issued an HTTP `308 Permanent Redirect` to HTTPS on port 443.
3. **Transparent Proxying**: Client headers (`Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`) are forwarded to Appwrite for correct domain resolution.
4. **Persistent Certificate Storage**: TLS states and internal CA data are preserved across container lifecycle via named volumes (`caddy-data` and `caddy-config`).
