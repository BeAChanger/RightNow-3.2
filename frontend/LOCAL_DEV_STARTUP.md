# RightNow Fitness Frontend Local Startup (Monorepo)

Last updated: 2026-03-05

This project now uses a monorepo layout:

- frontend app: `frontend/`
- backend API: `backend/`
- scripts and shared commands: repository root

## Recommended command

Run from repository root:

```powershell
cd E:\RightNow-Fitness
.\scripts\start-dev.ps1
```

## Manual commands

```powershell
cd E:\RightNow-Fitness
npm run db:up
npm run db:init
npm run dev:backend
npm run dev:frontend
```

## Key notes

- Frontend dev URL: `http://localhost:5173`
- Backend API URL: `http://localhost:5000`
- Frontend proxy default target is `http://localhost:5000` (`frontend/vite.config.ts`)
- Demo login: `demo@rightnow.fit` / `password123`

## Legacy path cleanup

Old path `rightnow-api` has been replaced by `backend` in scripts.
If you still use old commands, replace `rightnow-api` with `backend`.
