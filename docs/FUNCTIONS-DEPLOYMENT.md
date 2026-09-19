# Appwrite Functions on Fly.io

The console/API container and the Functions executor are separate concerns.
Appwrite can serve the console while function deployment fails when the executor
cannot reach a Docker daemon.

## Why the old setup failed

`fly-entrypoint.sh` started Docker-in-Docker (`dockerd`) inside the Appwrite web
machine and pointed `_APP_EXECUTOR_HOST` at `127.0.0.1:8082`. Fly machines are
not privileged Docker hosts, so this is not a reliable production executor.
The web image now defaults to an external executor and fails early with a clear
message if its address is missing.

## Required executor setup

Run OpenRuntimes Executor on a Docker-capable VM or host that can run function
containers. Configure the Appwrite app with the executor's reachable HTTPS URL:

```powershell
fly secrets set `_APP_EXECUTOR_HOST="https://<executor-host>/v1" -a phoxtra-cloud
fly secrets set `_APP_EXECUTOR_SECRET="<same-secret-used-by-executor>" -a phoxtra-cloud
fly deploy -c configs/fly.cloud.toml
```

The executor must be able to reach the Appwrite API/database as required by the
OpenRuntimes version in use. Do not commit either secret to TOML or PowerShell
files.

## Local development only

A local Docker-in-Docker executor can be requested with:

```powershell
fly secrets set _APP_EXECUTOR_LOCAL=true -a phoxtra-cloud
```

This is not recommended for production. Return to the supported mode with:

```powershell
fly secrets unset _APP_EXECUTOR_LOCAL -a phoxtra-cloud
```

## PowerShell helper

`scripts/configure-fly-executor.ps1` prompts for the executor URL and secret,
then stores them as Fly secrets before deployment.
