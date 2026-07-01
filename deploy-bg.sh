#!/bin/bash
# Background deployment - self-contained, logs to file
LOG=/root/rightnow/deploy-output.log
exec > $LOG 2>&1
set -x
cd /root/rightnow

echo "=== START $(date) ==="

# Export env vars
export $(grep -v '^#' .env | grep -v '^$' | xargs)

echo "=== DB Push ==="
docker compose -f docker-compose.prod.yml run --rm backend npx prisma db push --skip-generate

echo "=== Rebuild backend ==="
docker compose -f docker-compose.prod.yml build backend
docker compose -f docker-compose.prod.yml up -d backend
sleep 6

echo "=== Rebuild frontend ==="
docker compose -f docker-compose.prod.yml build frontend
docker compose -f docker-compose.prod.yml up -d frontend
sleep 4

echo "=== Smoke tests ==="
docker compose -f docker-compose.prod.yml ps
curl -s -o /dev/null -w "RPC: %{http_code}\n" http://127.0.0.1:5000/api/agent/rpc
curl -s -o /dev/null -w "Bindings: %{http_code}\n" -X POST http://127.0.0.1:5000/api/agent/bindings/code
curl -s -o /dev/null -w "Web: %{http_code}\n" http://127.0.0.1/

echo "=== DONE $(date) ==="
