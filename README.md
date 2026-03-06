# RightNow Fitness Monorepo

RightNow includes three runtime services and one admin console:

- `frontend/`: user-facing React app (Vite)
- `admin/`: admin React app (Vite)
- `backend/`: NestJS API + Prisma + PostgreSQL
- `rag-service/`: Python FastAPI RAG service

## Quick Start

```bash
npm run install:all
cd rag-service && pip install -r requirements.txt
```

### One-command startup

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

## Ports

- Frontend: `http://localhost:5173`
- Admin: `http://localhost:5174`
- Backend API: `http://localhost:5000`
- RAG service: `http://localhost:8000`
- PostgreSQL (Docker): `localhost:15433`

## Dev API Routing

- Frontend dev mode defaults to `http://localhost:5000/api`.
- `scripts/start-dev.ps1` and `scripts/start-dev.sh` start frontend with `VITE_API_BASE_URL=http://localhost:5000/api`.
- If you modify `frontend/vite.config.ts`, restart `npm run dev:frontend` to apply proxy changes.

## Default Accounts

- User demo: `demo@rightnow.fit` / `password123`
- Admin: `admin@admin.com` / `123456`

## Common Commands

```bash
npm run dev:frontend
npm run dev:admin
npm run dev:backend
npm run dev:rag
npm run db:up
npm run db:init
npm run build:frontend
npm run build:admin
npm run build:backend
```

## Admin MVP Modules

- User management (`/api/admin/users`): list/filter + freeze/unfreeze
- Knowledge base (`/api/admin/knowledge/*`): upload/list/delete/rescan via Nest proxy to RAG
- Prompt center (`/api/admin/prompts/*`): CRUD + prompt test
- Audit log (`/api/admin/audit`): key operation trace

Detailed startup and troubleshooting: [docs/existing/LOCAL_STARTUP_GUIDE.md](docs/existing/LOCAL_STARTUP_GUIDE.md)
