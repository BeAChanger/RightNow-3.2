#!/bin/bash
# Self-contained deployment script - no external env files needed
# Reads env from file, runs all steps, logs output

exec > /root/rightnow/deploy-output.log 2>&1
set -ex

cd /root/rightnow

echo "=== DEPLOY START $(date) ==="

# Load env - docker compose needs these in environment
set -o allexport
source /root/rightnow/.env
set +o allexport

echo "POSTGRES_DB=$POSTGRES_DB"
echo "DATABASE_URL length=${#DATABASE_URL}"

echo "[1] DB Push..."
docker compose -f /root/rightnow/docker-compose.prod.yml run --rm backend npx prisma db push --skip-generate
echo "DB Push OK"

echo "[2] Build backend..."
docker compose -f /root/rightnow/docker-compose.prod.yml build backend 2>&1 | tail -3
echo "Build backend OK"

echo "[3] Up backend..."
docker compose -f /root/rightnow/docker-compose.prod.yml up -d backend
sleep 6
echo "Backend up"

echo "[4] Build frontend..."
docker compose -f /root/rightnow/docker-compose.prod.yml build frontend 2>&1 | tail -3
echo "Build frontend OK"

echo "[5] Up frontend..."
docker compose -f /root/rightnow/docker-compose.prod.yml up -d frontend
sleep 4

echo "[6] Containers:"
docker compose -f /root/rightnow/docker-compose.prod.yml ps

echo "[7] Smoke:"
curl -s -o /dev/null -w "RPC:%{http_code} " http://127.0.0.1:5000/api/agent/rpc
curl -s -o /dev/null -w "Bindings:%{http_code} " -X POST http://127.0.0.1:5000/api/agent/bindings/code
curl -s -o /dev/null -w "Web:%{http_code}" http://127.0.0.1/
echo ""

echo "=== DEPLOY COMPLETE $(date) ==="

# Remove the cron entry that triggered this
crontab -r 2>/dev/null || true
