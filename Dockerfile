# Production Dockerfile for Phoxtra Cloud (Appwrite 1.9.6 + Console + Caddy)
FROM appwrite/console:latest AS console_builder
FROM appwrite/appwrite:1.9.6

LABEL maintainer="Phoxtra Infrastructure <phoxtra.am@gmail.com>"
LABEL description="Phoxtra Cloud Appwrite gateway"

# Copy Appwrite Console assets into web directory
RUN mkdir -p /var/www/console
COPY --from=console_builder /usr/share/nginx/html/ /var/www/console/
RUN if [ -d "/var/www/console/console" ]; then cp -rf /var/www/console/console/* /var/www/console/ && rm -rf /var/www/console/console; fi

# Copy patched Console SPA node files
COPY configs/console_patches/ /var/www/console/_app/immutable/nodes/

# Install Redis server, Socat, and Caddy inside container for standalone execution
RUN apk add --no-cache redis socat caddy

COPY configs/Caddyfile.fly /etc/caddy/Caddyfile.fly
COPY scripts/executor_router.php /usr/local/bin/executor_router.php
COPY docker/fly-entrypoint.sh /usr/local/bin/fly-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/fly-entrypoint.sh \
    && chmod +x /usr/local/bin/fly-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/bin/sh", "/usr/local/bin/fly-entrypoint.sh"]
