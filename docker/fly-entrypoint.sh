#!/bin/sh
set -eu

export _APP_CONNECTIONS_MAX="${_APP_CONNECTIONS_MAX:-1024}"
export _APP_CONSOLE_WHITELIST_ROOT="${_APP_CONSOLE_WHITELIST_ROOT:-disabled}"
export _APP_STORAGE_LIMIT="${_APP_STORAGE_LIMIT:-1073741824}"
export _APP_EXECUTOR_LOCAL="${_APP_EXECUTOR_LOCAL:-false}"

echo "[Phoxtra Engine] Starting Redis..."
if [ -n "${_APP_REDIS_PASS:-}" ]; then
    redis-server \
        --protected-mode no \
        --requirepass "$_APP_REDIS_PASS" \
        --daemonize yes
else
    redis-server \
        --protected-mode no \
        --daemonize yes
fi

echo "[Phoxtra Engine] Waiting for Redis..."
while :; do
    if [ -n "${_APP_REDIS_PASS:-}" ]; then
        redis-cli -a "$_APP_REDIS_PASS" ping >/dev/null 2>&1 && break
    else
        redis-cli ping >/dev/null 2>&1 && break
    fi
    sleep 1
done

echo "[Phoxtra Engine] Starting Appwrite workers..."
for worker in \
    audits \
    databases \
    deletes \
    functions \
    mails \
    messaging \
    webhooks \
    stats-usage \
    stats-resources \
    migrations \
    builds \
    certificates \
    executions \
    screenshots
do
    php app/worker.php "$worker" &
done

echo "[Phoxtra Engine] Starting Caddy on port 80..."
caddy start \
    --config /etc/caddy/Caddyfile.fly \
    --adapter caddyfile

export PORT=8081

echo "[Phoxtra Engine] Starting Appwrite HTTP server on port 8081..."
exec docker-php-entrypoint php app/http.php
