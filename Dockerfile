# Production Dockerfile for Phoxtra Cloud Platform Engine (Unified Backend + Caddy + Console SPA)
FROM appwrite/console:latest AS console_builder
FROM openruntimes/executor:0.4.5 AS executor_builder

FROM appwrite/appwrite:2.0.0

LABEL maintainer="Phoxtra Infrastructure <phoxtra.am@gmail.com>"
LABEL description="Phoxtra Cloud Self-Hosting Platform Engine"

# Copy Appwrite Console SPA static files to /var/www/console
RUN rm -rf /var/www/console/*
COPY --from=console_builder /usr/share/nginx/html/ /var/www/console/

# Install Redis server, Socat, and Caddy inside container for standalone execution
RUN apk add --no-cache redis socat caddy

# Copy Executor code
COPY --from=executor_builder /usr/local/src/ /usr/src/executor/

# Copy Caddy gateway configuration and Fly entrypoint script
COPY configs/Caddyfile.fly /etc/caddy/Caddyfile.fly
COPY ./docker/fly-entrypoint.sh /usr/local/bin/fly-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/fly-entrypoint.sh && chmod +x /usr/local/bin/fly-entrypoint.sh && test -f /usr/local/bin/fly-entrypoint.sh

# Expose HTTP and HTTPS services
EXPOSE 80 443

ENTRYPOINT ["/usr/local/bin/fly-entrypoint.sh"]
