param(
  [switch]$SkipDbInit,
  [switch]$SkipRag
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

Write-Host "[INFO] Project root: $root"

if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
  throw 'npm.cmd not found. Please install Node.js first.'
}

if (-not $SkipDbInit) {
  if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host '[1/4] Starting PostgreSQL container...'
    docker compose -f (Join-Path $root 'backend/docker-compose.yml') up -d
  } else {
    Write-Host '[WARN] Docker not found. Skip DB startup; ensure PostgreSQL is already running.'
  }

  Write-Host '[2/4] Initializing database (Prisma push + seed)...'
  npm.cmd --prefix $root run db:init
} else {
  Write-Host '[INFO] Skip database init by flag.'
}

Write-Host '[3/4] Starting backend and frontend in new terminal windows...'
Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "Set-Location '$root'; npm.cmd run dev:backend"
Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "Set-Location '$root'; npm.cmd run dev:frontend"

if (-not $SkipRag -and (Test-Path (Join-Path $root 'rag-service/main.py'))) {
  Write-Host '[4/4] Starting RAG service in a new terminal window...'
  Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "Set-Location '$root'; npm.cmd run dev:rag"
} else {
  Write-Host '[4/4] RAG startup skipped.'
}

Write-Host ''
Write-Host '[OK] Startup commands have been dispatched.'
Write-Host 'Frontend: http://localhost:5173'
Write-Host 'Backend:  http://localhost:5000'
Write-Host 'RAG:      http://localhost:8000'

