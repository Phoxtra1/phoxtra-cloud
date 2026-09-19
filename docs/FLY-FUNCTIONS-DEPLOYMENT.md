# Fly.io Functions deployment

## Architecture

`phoxtra-cloud` runs the Appwrite API, console, Redis, workers, and Caddy. It must not run Docker-in-Docker. Appwrite Functions require an external OpenRuntimes executor capable of starting function containers.

The cloud app now boots without executor secrets so the console and API can be verified first. Functions remain unavailable until an external executor is configured.

## Configure the external executor

The executor must be reachable from the Fly machine and must use the same secret as Appwrite:

```bash
fly secrets set \
  _APP_EXECUTOR_HOST="https://EXECUTOR_HOST/v1" \
  _APP_EXECUTOR_SECRET="A_LONG_RANDOM_SHARED_SECRET" \
  --app phoxtra-cloud
```

Do not commit either value to `configs/fly.cloud.toml`, `.env`, or documentation. The executor must be configured with the matching runtime secret and must expose its HTTP API at the URL supplied in `_APP_EXECUTOR_HOST`.

The executor host needs Docker access and outbound network access for function images. A normal Fly machine is not a suitable Docker-in-Docker host; use a separately managed Docker host or a supported OpenRuntimes executor service.

## Deployment order

1. Deploy the database:

```bash
fly deploy --config configs/fly.db.toml --app phoxtra-db
```

2. Confirm the database is running:

```bash
fly status --app phoxtra-db
```

3. Deploy the cloud gateway:

```bash
fly deploy --config configs/fly.cloud.toml --dockerfile Dockerfile --app phoxtra-cloud
```

4. Verify the gateway before configuring Functions:

```bash
fly status --app phoxtra-cloud
fly logs --app phoxtra-cloud --no-tail
curl -I https://phoxtra-cloud.fly.dev/
```

5. Set the executor secrets, redeploy if needed, and test a PHP Function from the Appwrite console.

## Important checks

- The public hostname in the manifest is `cloud.phoxtra.com`; `clou.phoxtra.com` is a different hostname.
- `_APP_EXECUTOR_HOST` must not be `127.0.0.1` when the executor is external.
- `_APP_EXECUTOR_SECRET` must match exactly on both sides.
- Do not restore the old `dockerd` startup block. It caused the machine to wait forever or fail because Fly does not provide the required Docker-in-Docker environment.
