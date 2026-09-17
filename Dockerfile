# Production Dockerfile for Phoxtra Cloud (Appwrite + Console + Caddy)
# Function execution is delegated to an external OpenRuntimes executor.
FROM appwrite/console:latest AS console_builder
FROM openruntimes/executor:0.25.4 AS executor_builder
FROM appwrite/appwrite:1.9.6

LABEL maintainer="Phoxtra Infrastructure <phoxtra.am@gmail.com>"
LABEL description="Phoxtra Cloud Appwrite gateway"

# Keep the Appwrite console in the image, but do not run a second web server for it.
RUN rm -rf /var/www/console/*
COPY --from=console_builder /usr/share/nginx/html/ /var/www/console/

# Redis is local to this image for the Fly single-machine deployment. Docker is
# installed as a client only; a Docker daemon must not be started inside Fly.
RUN apk add --no-cache redis socat caddy docker-cli

# Retained for the optional local-executor development mode. Production Fly
# deployments should use _APP_EXECUTOR_HOST and leave local mode disabled.
COPY --from=executor_builder /usr/local/src/ /usr/src/executor/
COPY configs/Caddyfile.fly /etc/caddy/Caddyfile.fly
COPY docker/fly-entrypoint.sh /usr/local/bin/fly-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/fly-entrypoint.sh \
    && chmod +x /usr/local/bin/fly-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/usr/local/bin/fly-entrypoint.sh"]
