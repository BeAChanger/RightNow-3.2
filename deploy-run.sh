#!/bin/bash
# Final deployment - run this on server: bash /root/rightnow/deploy-run.sh
set -e
cd /root/rightnow
source /root/rightnow/.env
echo "=== RightNow P0 Agent Deploy $(date) ==="

# DB Push
docker compose -f /root/rightnow/docker-compose.prod.yml run --rm backend npx prisma db push --skip-generate
echo "[1/3] DB Push: OK"

# Backend
docker compose -f /root/rightnow/docker-compose.prod.yml build backend
docker compose -f /root/rightnow/docker-compose.prod.yml up -d backend
sleep 6
echo "[2/3] Backend rebuilt: OK"

# Frontend
docker compose -f /root/rightnow/docker-compose.prod.yml build frontend
docker compose -f /root/rightnow/docker-compose.prod.yml up -d frontend
sleep 4
echo "[3/3] Frontend rebuilt: OK"

# Smoke
echo "RPC: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:5000/api/agent/rpc)"
echo "Web: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/)"
echo "=== DONE $(date) ==="
