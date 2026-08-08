# Phoxtra Cloud — Database & Data Backup Script (PowerShell)

Param(
    [string]$ContainerName = "phoxtra-cloud-mariadb",
    [string]$DatabaseName = "appwrite",
    [string]$BackupDir = "backups"
)

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Phoxtra Cloud — Automated Database Backup" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$RepoRoot = Split-Path -Parent $PSScriptRoot
$TargetBackupPath = Join-Path $RepoRoot $BackupDir

if (-not (Test-Path $TargetBackupPath)) {
    New-Item -ItemType Directory -Path $TargetBackupPath -Force | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupFileName = "phoxtra-db-dump-$Timestamp.sql"
$BackupFilePath = Join-Path $TargetBackupPath $BackupFileName

Write-Host "[*] Target Backup File: $BackupFilePath" -ForegroundColor Yellow

# Execute database dump via Docker if container is active
$DockerContainer = docker ps --filter "name=$ContainerName" --format "{{.Names}}"

if ($DockerContainer) {
    Write-Host "[*] Performing mariadb-dump from container: $ContainerName..." -ForegroundColor Cyan
    docker exec $ContainerName mariadb-dump -u root --all-databases > $BackupFilePath
    Write-Host "[ok] Backup successfully created: $BackupFileName" -ForegroundColor Green
} else {
    Write-Host "[!] Container '$ContainerName' is not currently running." -ForegroundColor Red
    Write-Host "[!] For Fly.io deployment backup, use: flyctl ssh console -a phoxtra-db" -ForegroundColor Yellow
}
