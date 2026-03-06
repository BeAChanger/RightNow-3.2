# RightNow Fitness Frontend Local Startup (Monorepo)

Last updated: 2026-03-06

This project uses a monorepo layout:

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
$env:VITE_API_BASE_URL='http://localhost:5000/api'
npm run dev:frontend
```

## Key notes

- Frontend dev URL: `http://localhost:5173`
- Backend API URL: `http://localhost:5000`
- Frontend dev API base now defaults to `http://localhost:5000/api` (`frontend/api/client.ts`)
- Vite proxy route pattern already includes `training-sessions` (`frontend/vite.config.ts`)
- Demo login: `demo@rightnow.fit` / `password123`

## Training flow verification

- In Action Center, click `¿ªÊ¼ÑµÁ·`.
- The app should call `POST /api/training-sessions` and then navigate to AI Coach.
- AI Coach in training mode should start with context-aware guidance (target muscle + recent training history summary).

## 404 troubleshooting

- If you see `POST http://localhost:5173/api/training-sessions 404`, restart frontend dev service.
- If you see `POST http://localhost:5000/api/training-sessions 404`, backend route is unavailable in current backend process.
- If you changed `frontend/vite.config.ts`, restart `npm run dev:frontend` to apply proxy changes.

## Legacy path cleanup

Old path `rightnow-api` has been replaced by `backend` in scripts.
If you still use old commands, replace `rightnow-api` with `backend`.
