#!/bin/sh
set -e

# Explicitly force whitelist environment defaults
export _APP_EXECUTOR_SECRET="${_APP_EXECUTOR_SECRET:-your-secret-key}"
export _APP_EXECUTOR_HOST="${_APP_EXECUTOR_HOST:-http://127.0.0.1:8082/v1}"
export _APP_CONNECTIONS_MAX="${_APP_CONNECTIONS_MAX:-1024}"
export _APP_CONSOLE_WHITELIST_ROOT="${_APP_CONSOLE_WHITELIST_ROOT:-disabled}"
export _APP_CONSOLE_WHITELIST_EMAILS="${_APP_CONSOLE_WHITELIST_EMAILS:-}"
export _APP_CONSOLE_WHITELIST_DOMAINS="${_APP_CONSOLE_WHITELIST_DOMAINS:-}"
export _APP_CONSOLE_WHITELIST_IPS="${_APP_CONSOLE_WHITELIST_IPS:-}"
export _APP_STORAGE_LIMIT="${_APP_STORAGE_LIMIT:-1073741824}"

# Start internal Redis service in background with optional authentication
echo "[Phoxtra Engine] Starting internal Redis service..."
if [ -n "$_APP_REDIS_PASS" ]; then
    redis-server --protected-mode no --requirepass "$_APP_REDIS_PASS" --daemonize yes
else
    redis-server --protected-mode no --daemonize yes
fi

# Wait for Redis to respond to PING
until ([ -n "$_APP_REDIS_PASS" ] && redis-cli -a "$_APP_REDIS_PASS" ping > /dev/null 2>&1) || redis-cli ping > /dev/null 2>&1; do
    echo "[Phoxtra Engine] Waiting for Redis service..."
    sleep 1
done
echo "[Phoxtra Engine] Redis service is UP and running."

# Start MariaDB proxy bridge via socat (bridges 127.0.0.1:3306 -> phoxtra-db.internal:3306)
echo "[Phoxtra Engine] Starting MariaDB proxy bridge..."
socat TCP-LISTEN:3306,fork,reuseaddr TCP:phoxtra-db.internal:3306 &

# Start Appwrite worker processes in background
echo "[Phoxtra Engine] Starting Appwrite worker processes..."
php app/worker.php audits &
php app/worker.php databases &
php app/worker.php deletes &
php app/worker.php functions &
php app/worker.php mails &
php app/worker.php messaging &
php app/worker.php webhooks &
php app/worker.php stats-usage &
php app/worker.php stats-resources &
php app/worker.php migrations &
php app/worker.php builds &
php app/worker.php certificates &
php app/worker.php executions &
php app/worker.php screenshots &

# Start Appwrite Executor process in background

# Start internal Docker daemon (DIND)
echo "[Phoxtra Engine] Starting internal Docker daemon (DIND)..."
dockerd --host=unix:///var/run/docker.sock > /var/log/dockerd.log 2>&1 &
until docker info > /dev/null 2>&1; do
    echo "[Phoxtra Engine] Waiting for Docker daemon..."
    sleep 1
done
echo "[Phoxtra Engine] Docker daemon is UP."

echo "[Phoxtra Engine] Creating appwrite_runtimes network..."
docker network inspect appwrite_runtimes >/dev/null 2>&1 || docker network create appwrite_runtimes

echo "[Phoxtra Engine] Starting Appwrite Executor process..."
(
    cd /usr/src/executor
    export PORT=8082
    export OPR_EXECUTOR_SECRET="${_APP_EXECUTOR_SECRET:-your-secret-key}"
    export OPR_EXECUTOR_INACTIVE_TRESHOLD="${_APP_FUNCTIONS_INACTIVE_THRESHOLD:-60}"
    export OPR_EXECUTOR_MAINTENANCE_INTERVAL="${_APP_FUNCTIONS_MAINTENANCE_INTERVAL:-3600}"
    export OPR_EXECUTOR_NETWORK="appwrite_runtimes"
    php app/http.php &
)

# Self-healing fix: Ensure Appwrite Console SPA assets are directly in /var/www/console/
if [ -d "/var/www/console/console" ]; then
    echo "[Phoxtra Engine] Flattening nested Console SPA assets into /var/www/console..."
    cp -rf /var/www/console/console/* /var/www/console/
    rm -rf /var/www/console/console
fi

echo "[Phoxtra Engine] Patching external Appwrite logo URLs to self-hosted SVG assets..."
grep -rl "https://appwrite.io/images/logos/logo.svg" /var/www/console/ 2>/dev/null | xargs -r sed -i 's|https://appwrite.io/images/logos/logo.svg|/console/images/onboarding/appwrite.svg|g' || true

# Generate dynamic Caddyfile gateway configuration
cat << 'CADDYEOF' > /etc/caddy/Caddyfile.fly
# Container Gateway Caddyfile for Phoxtra Cloud on Fly.io
:80 {
    # Appwrite Backend API
    handle /v1* {
        reverse_proxy 127.0.0.1:8081 {
            header_up Host {host}
            header_up X-Forwarded-Host {host}
            header_up X-Forwarded-Proto https
        }
    }

    # Appwrite Console Root and Route Redirects
    @root path /
    redir @root /console/ 302

    @console path /console
    redir @console /console/ 301

    @login path /login /register
    redir @login /console{path} 301

    # Fallback for external Appwrite logo requests
    handle /images/logos/logo.svg {
        rewrite * /console/images/onboarding/appwrite.svg
        root * /var/www
        file_server
    }

    # Appwrite Console SPA Gateway
    handle /console* {
        root * /var/www
        try_files {path} {path}/ /console/index.html
        file_server
    }

    handle {
        root * /var/www
        try_files {path} {path}/ /console/index.html
        file_server
    }
}
CADDYEOF

# Start Caddy Gateway in background on port 80 (routes /v1 to Swoole on 8081, and / to Console static SPA)
echo "[Phoxtra Engine] Starting internal Caddy Gateway on port 80..."
caddy run --config /etc/caddy/Caddyfile.fly &

# Export PORT 8081 for Appwrite Swoole PHP HTTP Server
export PORT=8081

# Log Database connection configuration for verification
echo "[Phoxtra Engine] DB Host: '${_APP_DB_HOST}'"
echo "[Phoxtra Engine] DB Port: '${_APP_DB_PORT}'"
echo "[Phoxtra Engine] DB User: '${_APP_DB_USER}'"
echo "[Phoxtra Engine] DB Schema: '${_APP_DB_SCHEMA}'"

# Execute standard Appwrite HTTP server entrypoint on port 8081
exec docker-php-entrypoint php app/http.php
