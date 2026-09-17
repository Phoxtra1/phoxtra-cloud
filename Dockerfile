# Production Dockerfile for Phoxtra Cloud Platform Engine
FROM appwrite/appwrite:1.9.6

LABEL maintainer="Phoxtra Infrastructure <phoxtra.am@gmail.com>"
LABEL description="Phoxtra Cloud Self-Hosting Platform Engine"

# Cloud-hosted Appwrite deployments should not run Docker-in-Docker or replace
# the official Appwrite startup flow. Keep the default process model and only
# install the few utilities needed for the runtime.
RUN apk add --no-cache redis socat caddy || true

# Keep a lightweight Fly-compatible wrapper that preserves the official Appwrite
# bootstrap, without starting a nested Docker daemon or a custom gateway stack.
COPY ./docker/fly-entrypoint.sh /usr/local/bin/fly-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/fly-entrypoint.sh \
    && chmod +x /usr/local/bin/fly-entrypoint.sh \
    && test -f /usr/local/bin/fly-entrypoint.sh

EXPOSE 80 443

ENTRYPOINT ["/usr/local/bin/fly-entrypoint.sh"]
