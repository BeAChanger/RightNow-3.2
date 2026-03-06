# RightNow Fitness Local Startup Guide

Last updated: 2026-03-06

## Startup Flow (Confirmed)

Use this exact command order:

```powershell
cd E:\RightNow-Fitness
npm run db:init
npm run dev:backend
npm run dev:frontend
npm run dev:admin
npm run dev:rag
```

## One-Command Startup Script

Windows PowerShell:

```powershell
cd E:\RightNow-Fitness
.\scripts\start-dev.ps1
```

Git Bash / WSL:

```bash
cd /e/RightNow-Fitness
./scripts/start-dev.sh
```

The scripts run the same confirmed order:

1. `npm run db:init`
2. `npm run dev:backend`
3. `npm run dev:frontend` (with `VITE_API_BASE_URL=http://localhost:5000/api`)
4. `npm run dev:admin`
5. `npm run dev:rag`

## Services and Ports

- Frontend (H5): http://localhost:5173
- Admin Frontend: http://localhost:5174
- Backend API (Nest): http://localhost:5000
- RAG service: http://localhost:8000

## Seed Accounts

- User demo account: `demo@rightnow.fit` / `password123`
- Admin account: `admin@admin.com` / `123456`

## Training Start Flow (Synced)

- In Action Center, click `¿ªÊ¼ÑµÁ·`.
- Frontend sends `POST /api/training-sessions`.
- After success, app navigates to AI Coach in training mode and injects training context prompt.
- If request fails, page should stay in Action Center and show a Chinese error tip.

## Dev API Routing Rule (Important)

- Frontend dev mode now defaults to `http://localhost:5000/api`.
- Startup scripts also inject `VITE_API_BASE_URL=http://localhost:5000/api` for frontend process.
- This avoids stale Vite proxy instances causing `/api/training-sessions` 404.

If you start frontend manually, use:

```powershell
cd E:\RightNow-Fitness
$env:VITE_API_BASE_URL='http://localhost:5000/api'
npm run dev:frontend
```

```bash
cd /e/RightNow-Fitness
VITE_API_BASE_URL=http://localhost:5000/api npm run dev:frontend
```

## Quick Health Checks

```powershell
$body = @{ email='admin@admin.com'; password='123456' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri 'http://localhost:5000/api/admin/auth/login' -ContentType 'application/json' -Body $body
```

```powershell
curl.exe -i -X POST http://localhost:5000/api/training-sessions
# Expected: 401/403 is acceptable before login; 404 means backend route is missing or backend is not the expected service.
```

## Troubleshooting: Clicking Start Training Has No Effect

- If request URL is `http://localhost:5173/api/training-sessions` and returns 404: restart frontend dev server.
- If request URL is `http://localhost:5000/api/training-sessions` and returns 404: backend not started or not using current branch.
- `cdn.tailwindcss.com should not be used in production` is a warning and not the root cause for this issue.
- Browser plugin logs like `Immersive Translate ERROR` can be ignored for this flow.
