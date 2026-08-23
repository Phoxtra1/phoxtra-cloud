# Phoxtra Cloud — Environment Setup & Initialization Script (PowerShell)

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Phoxtra Cloud Infrastructure — Environment Setup" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$RepoRoot = Split-Path -Parent $PSScriptRoot

# 1. Ensure required runtime directories exist
$Directories = @("backups", "configs", "docker", "docs", "logs", "monitoring", "scripts", "ssl")
foreach ($Dir in $Directories) {
    $Path = Join-Path $RepoRoot $Dir
    if (-not (Test-Path $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
        Write-Host "[+] Created directory: $Dir" -ForegroundColor Green
    }
}

# 2. Check for root .env file
$EnvFile = Join-Path $RepoRoot ".env"
$EnvExample = Join-Path $RepoRoot ".env.example"

if (-not (Test-Path $EnvFile)) {
    if (Test-Path $EnvExample) {
        Copy-Item -Path $EnvExample -Destination $EnvFile
        Write-Host "[!] Created .env from .env.example. PLEASE UPDATE SECRETS IN .env BEFORE STARTING SERVICES!" -ForegroundColor Yellow
    } else {
        Write-Host "[!] Error: .env.example not found!" -ForegroundColor Red
    }
} else {
    Write-Host "[ok] .env configuration file already exists." -ForegroundColor Green
}

# 3. Check Appwrite & Docker .env files
$AppwriteEnv = Join-Path $RepoRoot "appwrite\.env"
$AppwriteEnvExample = Join-Path $RepoRoot "appwrite\.env.example"

if (-not (Test-Path $AppwriteEnv)) {
    if (Test-Path $AppwriteEnvExample) {
        Copy-Item -Path $AppwriteEnvExample -Destination $AppwriteEnv
        Write-Host "[!] Created appwrite\.env from appwrite\.env.example." -ForegroundColor Yellow
    }
}

$DockerEnv = Join-Path $RepoRoot "docker\.env"
if (Test-Path $EnvFile) {
    Copy-Item -Path $EnvFile -Destination $DockerEnv -Force
    Write-Host "[ok] Synchronized docker\.env from root .env configuration." -ForegroundColor Green
}
Write-Host ""
Write-Host "[+] Environment initialization complete." -ForegroundColor Green
