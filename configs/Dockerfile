# Production Dockerfile for Phoxtra Cloud Platform Engine (Unified Backend + Caddy + Console SPA)
FROM appwrite/console:latest AS console_builder

FROM appwrite/appwrite:1.9.6

LABEL maintainer="Phoxtra Infrastructure <phoxtra.am@gmail.com>"
LABEL description="Phoxtra Cloud Self-Hosting Platform Engine"

# Copy Appwrite Console SPA static files to /var/www/console
RUN rm -rf /var/www/console/*
COPY --from=console_builder /usr/share/nginx/html/ /var/www/console/
RUN if [ -d "/var/www/console/console" ]; then cp -rf /var/www/console/console/* /var/www/console/ && rm -rf /var/www/console/console; fi

# Copy patched Console SPA node files
COPY configs/console_patches/ /var/www/console/_app/immutable/nodes/
RUN grep -rl "https://appwrite.io/images/logos/logo.svg" /var/www/console/ 2>/dev/null | xargs -r sed -i 's|https://appwrite.io/images/logos/logo.svg|/console/images/onboarding/appwrite.svg|g' || true


# Install Redis server, Socat, and Caddy inside container for standalone execution
RUN apk add --no-cache redis socat caddy

# Copy Caddy gateway configuration and Fly entrypoint script
COPY configs/Caddyfile.fly /etc/caddy/Caddyfile.fly
COPY docker/fly-entrypoint.sh /usr/local/bin/fly-entrypoint.sh
RUN chmod +x /usr/local/bin/fly-entrypoint.sh

# Expose HTTP and HTTPS services
EXPOSE 80 443

ENTRYPOINT ["/usr/local/bin/fly-entrypoint.sh"]
