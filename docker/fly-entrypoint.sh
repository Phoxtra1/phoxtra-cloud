#!/bin/sh
set -eu

# Keep the runtime compatible with Fly-style deployments without trying to
# start a nested Docker daemon or replace the Appwrite HTTP entrypoint.
# The Appwrite image already provides the correct startup flow for the web server.
export PORT="${PORT:-8080}"

# Ensure the standard Appwrite environment is available before launch.
if [ -n "${_APP_EXECUTOR_SECRET:-}" ]; then
    export _APP_EXECUTOR_SECRET
fi

# Intentionally do not start Redis, socat, Caddy, or dockerd here.
# Those services should be managed separately or left to the platform ingress.
exec /usr/local/bin/docker-php-entrypoint php app/http.php
