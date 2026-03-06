#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_API_BASE_URL="${VITE_API_BASE_URL:-http://localhost:5000/api}"

cd "$ROOT_DIR"

echo "[INFO] Project root: $ROOT_DIR"
echo "[PREP] Frontend API base url (dev): $FRONTEND_API_BASE_URL"
echo "[1/5] Running db init (prisma push + seed)..."
npm run db:init

echo "[2/5] Starting backend..."
npm run dev:backend &
BACKEND_PID=$!

echo "[3/5] Starting frontend..."
VITE_API_BASE_URL="$FRONTEND_API_BASE_URL" npm run dev:frontend &
FRONTEND_PID=$!

echo "[4/5] Starting admin frontend..."
npm run dev:admin &
ADMIN_PID=$!

echo "[5/5] Starting RAG service..."
npm run dev:rag &
RAG_PID=$!

cleanup() {
  echo ""
  echo "[INFO] Stopping services..."
  kill "$BACKEND_PID" >/dev/null 2>&1 || true
  kill "$FRONTEND_PID" >/dev/null 2>&1 || true
  kill "$ADMIN_PID" >/dev/null 2>&1 || true
  kill "$RAG_PID" >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM

echo ""
echo "[OK] Startup commands have been dispatched in your confirmed order:"
echo "  1) npm run db:init"
echo "  2) npm run dev:backend"
echo "  3) npm run dev:frontend (with VITE_API_BASE_URL=$FRONTEND_API_BASE_URL)"
echo "  4) npm run dev:admin"
echo "  5) npm run dev:rag"
echo ""
echo "Frontend:       http://localhost:5173"
echo "Admin Frontend: http://localhost:5174"
echo "Backend:        http://localhost:5000"
echo "RAG:            http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop all started services."

wait
