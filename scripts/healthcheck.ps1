# Phoxtra Cloud — System Health Check Utility (PowerShell)

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Phoxtra Cloud Infrastructure Health Assessment" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Local Docker Container Status
Write-Host "`n--- Local Gateway & Container Status ---" -ForegroundColor Yellow
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

# 2. Local Gateway & Route Verification
Write-Host "`n--- Local Gateway Testing ---" -ForegroundColor Yellow
# Ignore self-signed cert validation for local test
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}

$LocalEndpoints = @(
    @{ Name = "Local HTTP Gateway Redirect"; Uri = "http://localhost" },
    @{ Name = "Local HTTPS Gateway Endpoint"; Uri = "https://localhost" }
)

foreach ($Ep in $LocalEndpoints) {
    try {
        $Req = [System.Net.WebRequest]::Create($Ep.Uri)
        $Req.Timeout = 5000
        $Req.AllowAutoRedirect = $false
        $Res = $Req.GetResponse()
        Write-Host "[ok] $($Ep.Name) ($($Ep.Uri)) - Status: $([int]$Res.StatusCode) $($Res.StatusDescription)" -ForegroundColor Green
        $Res.Close()
    } catch [System.Net.WebException] {
        if ($_.Response) {
            $Code = [int]$_.Response.StatusCode
            Write-Host "[ok] $($Ep.Name) ($($Ep.Uri)) - Status: $Code ($($_.Response.StatusDescription))" -ForegroundColor Green
        } else {
            Write-Host "[!] $($Ep.Name) ($($Ep.Uri)) - Exception: $($_.Message)" -ForegroundColor Yellow
        }
    }
}

# 3. Fly.io Deployment Status (Read-Only)
Write-Host "`n--- Fly.io Deployed Apps Status (Read-Only) ---" -ForegroundColor Yellow
$FlyCli = "C:\Users\HP\.fly\bin\flyctl.exe"
if (Test-Path $FlyCli) {
    & $FlyCli status -a phoxtra-cloud
    & $FlyCli status -a phoxtra-db
} else {
    Write-Host "Fly.io CLI (flyctl) not detected at $FlyCli" -ForegroundColor Red
}
