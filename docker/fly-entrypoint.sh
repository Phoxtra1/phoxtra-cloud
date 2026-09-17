#!/bin/sh
set -eu

# Appwrite's function executor must run on a Docker-capable host. Fly machines
# are not privileged Docker hosts, so production uses _APP_EXECUTOR_HOST.
export _APP_CONNECTIONS_MAX="${_APP_CONNECTIONS_MAX:-1024}"
export _APP_CONSOLE_WHITELIST_ROOT="${_APP_CONSOLE_WHITELIST_ROOT:-disabled}"
export _APP_STORAGE_LIMIT="${_APP_STORAGE_LIMIT:-1073741824}"
export _APP_EXECUTOR_LOCAL="${_APP_EXECUTOR_LOCAL:-false}"

start_redis() {
    echo "[Phoxtra Engine] Starting Redis..."
    if [ -n "${_APP_REDIS_PASS:-}" ]; then
        redis-server --protected-mode no --requirepass "$ _APP_REDIS_PASS" --daemonize yes
    else
        redis-server --protected-mode no --daemonize yes
    fi
    until redis-cli ${_APP_REDIS_PASS:+-a "$_APP_REDIS_PASS"} ping >/dev/null 2>&1; do
        echo "[Phoxtra Engine] Waiting for Redis..."
        sleep 1
    done
}

start_workers() {
    echo "[Phoxtra Engine] Starting Appwrite workers..."
    for worker in audits databases deletes functions mails messaging webhooks stats-usage stats-resources migrations builds certificates executions screenshots; do
        php app/worker.php "$worker" &
    done
}

start_local_executor() {
    echo "[Phoxtra Engine] Starting local executor (development mode)..."
    dockerd --host=unix:///var/run/docker.sock > /var/log/dockerd.log 2>&1 &
    until docker info >/dev/null 2>&1; do
        echo "[Phoxtra Engine] Waiting for Docker daemon..."
        sleep 1
    done
    docker network inspect appwrite_runtimes >/dev/null 2>&1 || docker network create appwrite_runtimes
    (
        cd /usr/src/executor
        PORT=8082 \
        OPR_EXECUTOR_SECRET="${_APP_EXECUTOR_SECRET:?_APP_EXECUTOR_SECRET is required}" \
        OPR_EXECUTOR_NETWORK=appwrite_runtimes \
        php app/http.php
    ) &
    export _APP_EXECUTOR_HOST="http://127.0.0.1:8082/v1"
}

start_redis
start_workers

if [ "$ _APP_EXECUTOR_LOCAL" = "true" ]; then
    start_local_executor
elif [ -z "${_APP_EXECUTOR_HOST:-}" ]; then
    echo "[Phoxtra Engine] ERROR: _APP_EXECUTOR_HOST is required when _APP_EXECUTOR_LOCAL=false." >&2
    exit 1
else
    echo "[Phoxtra Engine] Using external executor: $_APP_EXECUTOR_HOST"
fi

# Caddy is the only process listening on Fly's public port 80.
caddy run --config /etc/caddy/Caddyfile.fly &
export PORT=8081
exec docker-php-entrypoint php app/http.php
