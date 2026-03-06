param()

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$frontendApiBaseUrl = if ($env:VITE_API_BASE_URL) { $env:VITE_API_BASE_URL } else { 'http://localhost:5000/api' }

Write-Host "[INFO] Project root: $root"
Write-Host "[PREP] Frontend API base url (dev): $frontendApiBaseUrl"

if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
  throw 'npm.cmd not found. Please install Node.js first.'
}

Set-Location $root

Write-Host '[1/5] Running db init (prisma push + seed)...'
npm.cmd run db:init

Write-Host '[2/5] Starting backend in a new terminal window...'
Start-Process powershell.exe -WorkingDirectory $root -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "npm.cmd run dev:backend"

Write-Host '[3/5] Starting frontend in a new terminal window...'
Start-Process powershell.exe -WorkingDirectory $root -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "`$env:VITE_API_BASE_URL='$frontendApiBaseUrl'; npm.cmd run dev:frontend"

Write-Host '[4/5] Starting admin frontend in a new terminal window...'
Start-Process powershell.exe -WorkingDirectory $root -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "npm.cmd run dev:admin"

Write-Host '[5/5] Starting RAG service in a new terminal window...'
Start-Process powershell.exe -WorkingDirectory $root -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "npm.cmd run dev:rag"

Write-Host ''
Write-Host '[OK] Startup commands have been dispatched in your confirmed order:'
Write-Host '  1) npm run db:init'
Write-Host '  2) npm run dev:backend'
Write-Host "  3) npm run dev:frontend (with VITE_API_BASE_URL=$frontendApiBaseUrl)"
Write-Host '  4) npm run dev:admin'
Write-Host '  5) npm run dev:rag'
Write-Host ''
Write-Host 'Frontend:       http://localhost:5173'
Write-Host 'Admin Frontend: http://localhost:5174'
Write-Host 'Backend:        http://localhost:5000'
Write-Host 'RAG:            http://localhost:8000'
