[CmdletBinding()]
param(
    [string]$App = "phoxtra-cloud",
    [string]$Config = "configs/fly.cloud.toml"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command fly -ErrorAction SilentlyContinue)) {
    throw "flyctl was not found. Install it first, then run this script again."
}

$ExecutorHost = Read-Host "OpenRuntimes executor URL (for example https://executor.example.com/v1)"
$ExecutorSecret = Read-Host "OpenRuntimes executor secret"

if ([string]::IsNullOrWhiteSpace($ExecutorHost) -or [string]::IsNullOrWhiteSpace($ExecutorSecret)) {
    throw "Both the executor URL and executor secret are required."
}

fly secrets set "_APP_EXECUTOR_HOST=$ExecutorHost" "_APP_EXECUTOR_SECRET=$ExecutorSecret" "_APP_EXECUTOR_LOCAL=false" -a $App
fly deploy -c $Config
