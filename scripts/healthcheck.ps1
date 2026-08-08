# Phoxtra Cloud — System Health Check Utility (PowerShell)

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Phoxtra Cloud Infrastructure Health Assessment" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Local Docker Container Status
Write-Host "`n--- Docker Container Status ---" -ForegroundColor Yellow
try {
    $Containers = docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    if ($Containers) {
        Write-Host $Containers -ForegroundColor Green
    } else {
        Write-Host "No active local Docker containers found." -ForegroundColor Gray
    }
} catch {
    Write-Host "Docker daemon is not running or accessible." -ForegroundColor Red
}

# 2. Fly.io Deployment Status
Write-Host "`n--- Fly.io Deployed Apps Status ---" -ForegroundColor Yellow
$FlyCli = "C:\Users\HP\.fly\bin\flyctl.exe"
if (Test-Path $FlyCli) {
    & $FlyCli status -a phoxtra-cloud
    & $FlyCli status -a phoxtra-db
} else {
    Write-Host "Fly.io CLI (flyctl) not detected at $FlyCli" -ForegroundColor Red
}

# 3. Endpoint Connectivity Assessment
Write-Host "`n--- Target Endpoints ---" -ForegroundColor Yellow
$Endpoints = @("https://cloud.phoxtra.com", "https://phoxtra-cloud.fly.dev")
foreach ($Endpoint in $Endpoints) {
    try {
        $Response = Invoke-WebRequest -Uri $Endpoint -TimeoutSec 5 -ErrorAction Stop
        Write-Host "[ok] $Endpoint - Status: $($Response.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "[!] $Endpoint - Connection failed or suspended: $($_.Exception.Message)" -ForegroundColor Red
    }
}
