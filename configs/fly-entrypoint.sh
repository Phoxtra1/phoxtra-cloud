#!/bin/sh
set -e

# Explicitly force whitelist environment defaults
export _APP_CONSOLE_WHITELIST_ROOT="enabled"
export _APP_CONSOLE_WHITELIST_EMAILS="phoxmanglobal@gmail.com"
export _APP_CONSOLE_WHITELIST_DOMAINS="gmail.com,phoxtra.com"
export _APP_CONSOLE_WHITELIST_IPS=""

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

# Start MariaDB IPv6 bridge via socat (bridges 127.0.0.1:3306 -> MariaDB 6PN)
echo "[Phoxtra Engine] Starting MariaDB IPv6 proxy bridge..."
socat TCP-LISTEN:3306,fork,reuseaddr TCP:[fdaa:18:121c:a7b:c8:6a54:46cd:2]:3306 &

# Start Appwrite worker processes in background
echo "[Phoxtra Engine] Starting Appwrite worker processes..."
php app/worker.php audits &
php app/worker.php databases &
php app/worker.php deletes &
php app/worker.php functions &
php app/worker.php mails &
php app/worker.php messaging &
php app/worker.php webhooks &
php app/worker.php statsUsage &
php app/worker.php migrations &
php app/worker.php builds &
php app/worker.php certificates &

# Self-healing fix: Ensure Appwrite Console SPA assets are directly in /var/www/console/
if [ -d "/var/www/console/console" ]; then
    echo "[Phoxtra Engine] Flattening nested Console SPA assets into /var/www/console..."
    cp -rf /var/www/console/console/* /var/www/console/
    rm -rf /var/www/console/console
fi

# Generate dynamic Caddyfile gateway configuration
cat << 'EOF' > /etc/caddy/Caddyfile.fly
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

    # Appwrite Console SPA Static Server with Fallback
    handle {
        root * /var/www
        try_files {path} {path}/ /console/index.html
        file_server
    }
}
EOF

# Start Caddy Gateway in background on port 80 (routes /v1 to Swoole on 8081, and / to Console static SPA)
echo "[Phoxtra Engine] Starting internal Caddy Gateway on port 80..."
caddy start --config /etc/caddy/Caddyfile.fly

# Export PORT 8081 for Appwrite Swoole PHP HTTP Server
export PORT=8081

# Log Database connection configuration for verification
echo "[Phoxtra Engine] DB Host: '${_APP_DB_HOST}'"
echo "[Phoxtra Engine] DB Port: '${_APP_DB_PORT}'"
echo "[Phoxtra Engine] DB User: '${_APP_DB_USER}'"
echo "[Phoxtra Engine] DB Schema: '${_APP_DB_SCHEMA}'"

# Execute standard Appwrite HTTP server entrypoint on port 8081
exec docker-php-entrypoint php app/http.php
