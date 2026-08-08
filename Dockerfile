# Production Dockerfile for Phoxtra Cloud Platform Engine
# Base image for self-hosted cloud platform engine

FROM appwrite/appwrite:latest

LABEL maintainer="Phoxtra Infrastructure <phoxtra.am@gmail.com>"
LABEL description="Phoxtra Cloud Self-Hosting Platform Engine"

# Expose HTTP and HTTPS services
EXPOSE 80 443
