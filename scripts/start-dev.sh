#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[ERROR] Missing command: $1"
    exit 1
  fi
}

cleanup() {
  echo ""
  echo "[INFO] Stopping services..."
  if [[ -n "${FRONTEND_PID:-}" ]]; then
    kill "$FRONTEND_PID" >/dev/null 2>&1 || true
  fi
  if [[ -n "${BACKEND_PID:-}" ]]; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
  fi
  if [[ -n "${RAG_PID:-}" ]]; then
    kill "$RAG_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

require_cmd npm
require_cmd python

cd "$ROOT_DIR"

echo "[1/6] Starting PostgreSQL container..."
if command -v docker >/dev/null 2>&1; then
  docker compose -f backend/docker-compose.yml up -d
else
  echo "[WARN] Docker not found. Skip DB startup; ensure PostgreSQL is already running."
fi

echo "[2/6] Pushing Prisma schema..."
npm run db:push

echo "[3/6] Seeding demo data..."
npm run db:seed

echo "[4/6] Starting backend (http://localhost:5000)..."
npm run dev:backend &
BACKEND_PID=$!

sleep 3

echo "[5/6] Starting frontend (http://localhost:5173)..."
npm run dev:frontend &
FRONTEND_PID=$!

if [[ -d "$ROOT_DIR/rag-service" ]]; then
  echo "[6/6] Starting RAG service (http://localhost:8000)..."
  npm run dev:rag &
  RAG_PID=$!
else
  echo "[6/6] RAG service directory not found, skip."
fi

echo ""
echo "[OK] RightNow services are starting."
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:5000"
echo "RAG:      http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop all started services."

wait
