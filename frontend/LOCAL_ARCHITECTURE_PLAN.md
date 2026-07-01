# RightNow Fitness Local Architecture Plan

## 1. Goal

Current frontend is mostly complete and can already build successfully.
The immediate goal is to make the project runnable end-to-end on a local machine, with a stable backend architecture that can continue to scale.

This plan records the agreed technical direction and the phased implementation order.

## 2. Agreed Stack

- Frontend: React 19 + TypeScript + Vite
- Backend: NestJS + TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Auth: JWT
- File Upload: NestJS + Multer, local `uploads/` storage

## 3. Current Status

### Frontend

- Frontend project can build successfully with `npm run build`.
- Existing frontend already defines a clear API contract in the `api/` directory.
- The frontend now uses Vite proxy to forward `/api` and `/uploads` to the local backend.

### Backend

- `rightnow-api` has been implemented as a NestJS monolith for local-first development.
- Prisma schema has been created and mapped to current frontend needs.
- Core modules have been scaffolded and compiled successfully.

### Remaining blocker for full local run

- PostgreSQL is not currently running on the machine.
- Docker CLI exists, but Docker Desktop daemon was not running during verification.
- Because of that, database initialization (`prisma push`, seed, runtime connection) could not be completed yet.

## 4. Architecture Decision

Use a single NestJS application in `rightnow-api` instead of microservices.

Reason:

- The current target is "run locally first".
- Frontend and backend are still in active iteration.
- A monolith is faster to implement, easier to debug, and keeps deployment and local setup simple.
- Later, if business complexity increases, modules can still be split out.

## 5. Backend Module Plan

The backend modules are aligned directly with the frontend `api/*.ts` contract:

1. `auth`
2. `users`
3. `weight`
4. `diet`
5. `training`
6. `todos`
7. `checkins`
8. `upload`
9. `evolution`
10. `posts`
11. `friendships`
12. `chat`

This keeps frontend integration straightforward and avoids duplicate contract design work.

## 6. Database Model Plan

Prisma models are designed around the current UI features:

1. `User`
2. `WeightRecord`
3. `DietRecord`
4. `TrainingRecord`
5. `Todo`
6. `CheckIn`
7. `UploadAsset`
8. `EvolutionRecord`
9. `Post`
10. `Comment`
11. `Friendship`
12. `ChatMessage`

### Core relationships

- Most business data belongs to `User`.
- `Friendship` uses `requesterId` and `receiverId` to link two users.
- `Post` and `Comment` model community interactions.
- `UploadAsset` and `EvolutionRecord` support image-based flows.
- `ChatMessage` stores both user and assistant messages for local chat history.

## 7. Implementation Priority

### Phase 1: Minimum viable local run

Focus on the main product loop first:

1. `auth`
2. `users`
3. `weight`
4. `diet`
5. `training`
6. `todos`
7. `checkins`
8. `upload`

Expected result:

- User can register / login
- User can enter the app
- User can save core health and check-in data
- Main dashboard pages stop failing on missing backend APIs

### Phase 2: Extended product features

After the core loop is stable, complete the secondary modules:

1. `evolution`
2. `posts`
3. `friendships`
4. `chat`

Expected result:

- Community flow is available
- Evolution record flow is available
- AI chat has persistent local history and stubbed assistant responses

## 8. Runtime Design

### Ports

- Frontend dev server: `http://localhost:5173`
- Backend API server: `http://localhost:3000`

### Routing

- Frontend calls `/api/*`
- Vite proxies `/api/*` to backend
- Uploaded files are exposed under `/uploads/*`

### Environment variables

Backend requires at least:

- `DATABASE_URL`
- `JWT_SECRET`
- `PORT`
- `CORS_ORIGIN`

Optional later:

- `GEMINI_API_KEY`

## 9. Recommended Local Run Flow

Once Docker Desktop is running:

1. Start PostgreSQL:
   - `cd rightnow-api`
   - `docker compose up -d`
2. Initialize database:
   - `npm run prisma:push`
   - `npm run prisma:seed`
3. Start backend:
   - `npm run start:dev`
4. Start frontend from project root:
   - `npm run dev`

## 10. Validation Status

Completed:

- Frontend build passed
- Backend dependency install passed
- Prisma client generation passed
- Backend TypeScript build passed
- Frontend Vite proxy was added

Not completed yet:

- PostgreSQL runtime verification
- Prisma schema push against a live database
- Full frontend-backend login flow verification

## 11. Risks and Notes

- The current backend is intentionally optimized for local development speed, not production hardening.
- File upload is stored locally in `rightnow-api/uploads/`, which is fine for development but should be replaced by object storage later if needed.
- Chat responses are currently stubbed, not connected to a real LLM.
- Some frontend pages still contain mock UI text and non-critical placeholder behavior; backend support is now structured to replace those progressively.

## 12. Next Step

The next concrete step is not more architecture work.
It is to start PostgreSQL, run Prisma initialization, and then verify the local login and main user flow end-to-end.
