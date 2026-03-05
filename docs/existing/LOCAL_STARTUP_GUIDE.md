# RightNow Fitness Local Startup Guide

Last updated: 2026-03-05

## Port Mapping

- Frontend (Vite): `http://localhost:5173`
- Backend API (Nest): `http://localhost:5000`
- PostgreSQL (Docker): `localhost:15433`
- RAG service (optional): `http://localhost:8000`

## One-Command Startup (Recommended)

### Windows PowerShell

```powershell
cd E:\RightNow-Fitness
.\scripts\start-dev.ps1
```

Optional flags:

```powershell
.\scripts\start-dev.ps1 -SkipDbInit   # Skip db push/seed
.\scripts\start-dev.ps1 -SkipRag      # Skip RAG startup
```

### Git Bash / WSL

```bash
cd /e/RightNow-Fitness
./scripts/start-dev.sh
```

## Manual Startup

### 1. Install dependencies

```powershell
cd E:\RightNow-Fitness
npm run install:all
```

### 2. Start database and initialize schema/data

```powershell
npm run db:up
npm run db:init
```

### 3. Start backend (new terminal)

```powershell
cd E:\RightNow-Fitness
npm run dev:backend
```

### 4. Start frontend (new terminal)

```powershell
cd E:\RightNow-Fitness
npm run dev:frontend
```

### 5. (Optional) Start RAG service

```powershell
cd E:\RightNow-Fitness
npm run dev:rag
```

## Quick Health Checks

```powershell
# Backend health via login endpoint
$body = @{ email='demo@rightnow.fit'; password='password123' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri 'http://localhost:5000/api/auth/login' -ContentType 'application/json' -Body $body
```

```powershell
# Verify listening ports
netstat -ano | Select-String ':5000|:5173|:15433|:8000'
```

## Demo Account

- Email: `demo@rightnow.fit`
- Password: `password123`

## Troubleshooting

### `POST /api/auth/login` returns 500 from `http://localhost:5173/api/...`

- Confirm backend is running on `5000`.
- Confirm frontend proxy default target is `http://localhost:5000` in `frontend/vite.config.ts`.
- Run:

```powershell
npm run db:init
npm run dev:backend
npm run dev:frontend
```

### `'nest' is not recognized`

Do not start backend by `cd backend && npm run start:dev` in this monorepo setup.
Use root workspace command instead:

```powershell
cd E:\RightNow-Fitness
npm run dev:backend
```

### Tailwind CDN warning in browser console

`cdn.tailwindcss.com should not be used in production` is a warning and does not block local startup.
