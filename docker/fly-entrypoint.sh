sh
#!/bin/sh
set -eu

# Appwrite's function executor must run on a Docker-capable host.
# Production uses an external OpenRuntimes executor through _APP_EXECUTOR_HOST.
# The Fly Appwrite container must not start a local Docker-in-Docker executor.

export _APP_CONNECTIONS_MAX="${_APP_CONNECTIONS_MAX:-1024}"
export _APP_CONSOLE_WHITELIST_ROOT="${_APP_CONSOLE_WHITELIST_ROOT:-disabled}"
export _APP_STORAGE_LIMIT="${_APP_STORAGE_LIMIT:-1073741824}"
export _APP_EXECUTOR_LOCAL="${_APP_EXECUTOR_LOCAL:-false}"

if [ -z "${_APP_EXECUTOR_HOST:-}" ]; then
    echo "[Phoxtra Engine] ERROR: _APP_EXECUTOR_HOST is not configured."
    echo "[Phoxtra Engine] An external OpenRuntimes executor is required for Functions."
    exit 1
fi

start_redis() {
    echo "[Phoxtra Engine] Starting Redis..."
    if [ -n "${_APP_REDIS_PASS:-}" ]; then
        redis-server --protected-mode no --requirepass "$_APP_REDIS_PASS" --daemonize yes
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
