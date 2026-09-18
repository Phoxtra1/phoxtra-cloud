#!/bin/sh
set -eu

# Appwrite Functions require an external OpenRuntimes executor on Fly.io.
# Do not attempt to start Docker-in-Docker inside this machine.
export _APP_CONNECTIONS_MAX="${_APP_CONNECTIONS_MAX:-1024}"
export _APP_CONSOLE_WHITELIST_ROOT="${_APP_CONSOLE_WHITELIST_ROOT:-disabled}"
export _APP_STORAGE_LIMIT="${_APP_STORAGE_LIMIT:-1073741824}"
export _APP_EXECUTOR_LOCAL="${_APP_EXECUTOR_LOCAL:-false}"

if [ -z "${_APP_EXECUTOR_HOST:-}" ]; then
    echo "[Phoxtra Engine] ERROR: _APP_EXECUTOR_HOST is not configured."
    echo "[Phoxtra Engine] Configure the external OpenRuntimes executor before starting Appwrite."
    exit 1
fi

start_redis() {
    echo "[Phoxtra Engine] Starting Redis..."
    if [ -n "${_APP_REDIS_PASS:-}" ]; then
        redis-server --protected-mode no --requirepass "$_APP_REDIS_PASS" --daemonize yes
    else
        redis-server --protected-mode no --daemonize yes
    fi

    while :; do
        if [ -n "${_APP_REDIS_PASS:-}" ]; then
            redis-cli -a "$_APP_REDIS_PASS" ping >/dev/null 2>&1 && break
        else
            redis-cli ping >/dev/null 2>&1 && break
        fi
        echo "[Phoxtra Engine] Waiting for Redis..."
        sleep 1
    done
    echo "[Phoxtra Engine] Redis is ready."
}

start_workers() {
    echo "[Phoxtra Engine] Starting Appwrite workers..."
    for worker in audits databases deletes functions mails messaging webhooks stats-usage stats-resources migrations builds certificates executions screenshots; do
        php app/worker.php "$worker" &
    done
}

start_gateway() {
    echo "[Phoxtra Engine] Starting Caddy gateway on port 80..."
    caddy start --config /etc/caddy/Caddyfile.fly --adapter caddyfile
}

start_redis
start_workers
start_gateway

# Keep Appwrite's HTTP server in the foreground so the machine remains alive.
export PORT=8081
exec docker-php-entrypoint php app/http.php
