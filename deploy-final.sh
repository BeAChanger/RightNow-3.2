#!/bin/bash
# RightNow P0 Agent - Complete Deploy
set -e

cd /root/rightnow

echo "=== RightNow P0 Agent Deploy $(date) ==="

# Docker compose reads .env from project dir automatically
echo "[1/4] DB Schema Push..."
docker compose --env-file /root/rightnow/.env -f /root/rightnow/docker-compose.prod.yml run --rm backend npx prisma db push --skip-generate
echo "DB push OK"

echo "[2/4] Rebuild backend..."
docker compose --env-file /root/rightnow/.env -f /root/rightnow/docker-compose.prod.yml build backend 2>&1 | tail -3
docker compose --env-file /root/rightnow/.env -f /root/rightnow/docker-compose.prod.yml up -d backend
sleep 6
echo "Backend OK"

echo "[3/4] Rebuild frontend..."
docker compose --env-file /root/rightnow/.env -f /root/rightnow/docker-compose.prod.yml build frontend 2>&1 | tail -3
docker compose --env-file /root/rightnow/.env -f /root/rightnow/docker-compose.prod.yml up -d frontend
sleep 4
echo "Frontend OK"

echo "[4/4] Smoke tests..."
docker compose --env-file /root/rightnow/.env -f /root/rightnow/docker-compose.prod.yml ps --format 'table {{.Name}}\t{{.Status}}'
echo "Agent RPC: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:5000/api/agent/rpc)"
echo "Bindings: $(curl -s -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:5000/api/agent/bindings/code)"
echo "Web: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/)"
echo ""
echo "=== DEPLOY COMPLETE $(date) ==="
