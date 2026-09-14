# Phoxtra Cloud — Automated RAM & Capacity Scaling Utility
# Usage: .\scripts\scale-capacity.ps1 -MemoryMB 2048

Param(
    [int]$MemoryMB = 2048,
    [string]$DbApp = "phoxtra-db",
    [string]$CloudApp = "phoxtra-cloud"
)

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Phoxtra Cloud — Capacity Scaling Utility ($MemoryMB MB)" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Scale Database Service First (Internal Network — No SSL Impact)
Write-Host "[1/3] Scaling Database Service ($DbApp) memory to $MemoryMB MB..." -ForegroundColor Yellow
try {
    fly scale memory $MemoryMB -a $DbApp
    Write-Host "  ✓ Database service memory scaled successfully." -ForegroundColor Green
} catch {
    Write-Host "  ! Failed to scale database memory via flyctl: $_" -ForegroundColor Red
}

Write-Host "  [*] Waiting 5s for MariaDB memory buffer allocation..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# 2. Scale Application Gateway Service
Write-Host "[2/3] Scaling Application Engine ($CloudApp) memory to $MemoryMB MB..." -ForegroundColor Yellow
try {
    fly scale memory $MemoryMB -a $CloudApp
    Write-Host "  ✓ Application engine memory scaled successfully." -ForegroundColor Green
} catch {
    Write-Host "  ! Failed to scale application memory via flyctl: $_" -ForegroundColor Red
}

# 3. Post-Scale Gateway Health Check Warm-Up
Write-Host "[3/3] Waiting 15s for Caddy Gateway healthchecks and SSL session resumption..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " SUCCESS: Phoxtra Cloud capacity scaled to $MemoryMB MB!" -ForegroundColor Green
Write-Host " You can now visit https://cloud.phoxtra.com" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
