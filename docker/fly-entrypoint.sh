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

# Start MariaDB proxy bridge via socat (bridges 127.0.0.1:3306 -> phoxtra-db.internal:3306)
echo "[Phoxtra Engine] Starting MariaDB proxy bridge..."
socat TCP-LISTEN:3306,fork,reuseaddr TCP:phoxtra-db.internal:3306 &

# Start local executor service on 127.0.0.1:8080
echo "[Phoxtra Engine] Starting Appwrite local executor daemon on port 8080..."
php -S 127.0.0.1:8080 /usr/local/bin/executor_router.php >/var/log/executor.log 2>&1 &

# Self-healing fix: Ensure Appwrite Console SPA assets are directly in /var/www/console/
if [ -d "/var/www/console/console" ]; then
    echo "[Phoxtra Engine] Flattening nested Console SPA assets into /var/www/console..."
    cp -rf /var/www/console/console/* /var/www/console/
    rm -rf /var/www/console/console
fi

# Disable service worker registration inside index.html to prevent client route trapping
if [ -f "/var/www/console/index.html" ]; then
    sed -i "s/navigator.serviceWorker.register(sanitised);/if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister()));}/g" /var/www/console/index.html
fi

# Ensure service worker file self-unregisters and remove pre-compressed Brotli/Gzip copies
rm -f /var/www/console/service-worker.js*
cat << 'EOF' > /var/www/console/service-worker.js
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
            .then(() => self.registration.unregister())
            .then(() => self.clients.claim())
    );
});
self.addEventListener('fetch', (e) => {
    e.respondWith(fetch(e.request));
});
EOF

echo "[Phoxtra Engine] Starting Caddy on port 80..."
caddy start \
    --config /etc/caddy/Caddyfile.fly \
    --adapter caddyfile

export PORT=8081

echo "[Phoxtra Engine] Starting Appwrite HTTP server on port 8081..."
exec docker-php-entrypoint php app/http.php
