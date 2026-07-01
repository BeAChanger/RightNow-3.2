#!/bin/bash
# Combined: fix .env, push DB, rebuild containers
# All output goes to log file — nothing printed to stdout
set -e
exec > /root/rightnow/deploy-combined.log 2>&1
echo "=== START $(date) ==="

cd /root/rightnow

echo "[0] Fixing .env from running containers..."
for var in POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD DATABASE_URL JWT_SECRET; do
  if ! grep -q "^${var}=" .env 2>/dev/null; then
    val=$(docker inspect rn-postgres rn-backend 2>/dev/null | grep "^${var}=" | head -1 | cut -d= -f2-)
    if [ -n "$val" ]; then
      echo "${var}=${val}" >> .env
      echo "  Added $var"
    fi
  fi
done
echo "[0] .env fix done"

# Source env
set -a; source .env; set +a

echo "[1] DB Push..."
docker compose -f docker-compose.prod.yml run --rm backend npx prisma db push --skip-generate
echo "[1] DB Push OK"

echo "[2] Build backend..."
docker compose -f docker-compose.prod.yml build backend
echo "[2] Build backend OK"

echo "[3] Up backend..."
docker compose -f docker-compose.prod.yml up -d backend
sleep 6
echo "[3] Backend up"

echo "[4] Build frontend..."
docker compose -f docker-compose.prod.yml build frontend
echo "[4] Build frontend OK"

echo "[5] Up frontend..."
docker compose -f docker-compose.prod.yml up -d frontend
sleep 4
echo "[5] Frontend up"

echo "[6] Smoke..."
echo "RPC: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:5000/api/agent/rpc)"
echo "Web: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/)"
echo "[6] Smoke done"

docker compose -f docker-compose.prod.yml ps
echo "=== DONE $(date) ==="
