#!/bin/bash
# fix-xiaozhua.sh — Diagnose & fix RPC 401 + Nginx 404
set -euo pipefail
cd /root/rightnow

echo "=========================================="
echo " FIX: RPC 401 & Nginx 404"
echo " $(date)"
echo "=========================================="

env_get() {
    grep "^${1}=" .env 2>/dev/null | head -1 | cut -d= -f2- || true
}

TOKEN=$(env_get AGENT_SERVICE_TOKEN)
echo "Token from .env: ${TOKEN:0:8}..."

# ── 1. Check what token backend actually has ──
echo ""
echo "=== Backend Token Status ==="
BACKEND_TOKEN_LEN=$(docker exec rn-backend sh -c 'echo -n $AGENT_SERVICE_TOKEN | wc -c' 2>/dev/null || echo "0")
echo "Backend AGENT_SERVICE_TOKEN length: $BACKEND_TOKEN_LEN"
if [ "$BACKEND_TOKEN_LEN" = "0" ]; then
    echo "DIAGNOSIS: Backend has EMPTY token! Need docker compose up, not just restart."

    # Find compose file
    COMPOSE_FILE=""
    for f in docker-compose.prod.yml docker-compose.yml docker-compose.yaml; do
        if [ -f "$f" ]; then COMPOSE_FILE="$f"; break; fi
    done

    if [ -n "$COMPOSE_FILE" ]; then
        echo "Using compose file: $COMPOSE_FILE"
        docker compose -f "$COMPOSE_FILE" up -d backend
    else
        echo "No compose file found, manually recreating backend..."
        # Stop & remove backend
        docker stop rn-backend 2>/dev/null || true
        docker rm rn-backend 2>/dev/null || true
        # Re-run with compose-like env
        docker run -d --name rn-backend --network rightnow_default --restart unless-stopped \
            -e "AGENT_SERVICE_TOKEN=$TOKEN" \
            -e "DATABASE_URL=$(env_get DATABASE_URL)" \
            -e "JWT_SECRET=$(env_get JWT_SECRET)" \
            -e "PORT=5000" -e "HOST=0.0.0.0" \
            -e "ADMIN_SEED_EMAIL=$(env_get ADMIN_SEED_EMAIL)" \
            -e "ADMIN_SEED_PASSWORD=$(env_get ADMIN_SEED_PASSWORD)" \
            -e "ADMIN_SEED_NAME=$(env_get ADMIN_SEED_NAME)" \
            -e "STEPFUN_BASE_URL=$(env_get STEPFUN_BASE_URL)" \
            -e "STEPFUN_API_KEY=$(env_get STEPFUN_API_KEY)" \
            -v uploads:/app/uploads \
            $(docker inspect rn-backend --format '{{.Config.Image}}' 2>/dev/null || echo "rightnow-backend")
    fi
    sleep 5
else
    echo "Backend token is set (len=$BACKEND_TOKEN_LEN)"
fi

# ── 2. Test RPC again ──
echo ""
echo "=== RPC Test (re-verify) ==="
docker exec rn-openclaw-agent curl -s -X POST http://rn-backend:5000/api/agent/rpc \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d '{"channel":"test","channelUserId":"test123","tool":"user.profile.get","args":{}}' 2>&1

# ── 3. Fix Nginx ──
echo ""
echo ""
echo "=== Nginx Fix ==="

# Check if openclaw-agent resolves from nginx container
echo "--- DNS check from nginx ---"
docker exec rn-nginx sh -c 'getent hosts openclaw-agent 2>/dev/null || nslookup openclaw-agent 2>/dev/null || echo "DNS: openclaw-agent NOT resolving"' 2>&1 || echo "Cannot check nginx DNS"

# Check nginx config
echo "--- Nginx config (proxy to openclaw-agent) ---"
docker exec rn-nginx cat /etc/nginx/conf.d/default.conf 2>/dev/null | grep -B2 -A5 '18789\|openclaw\|xiaozhua\|imhook' || echo "No imhook/openclaw proxy rule in nginx config"

# Check if gateway has network alias
echo "--- Gateway network aliases ---"
docker inspect rn-openclaw-agent --format '{{range $net,$v := .NetworkSettings.Networks}}Network: {{$net}} Aliases: {{$v.Aliases}}{{println}}{{end}}' 2>/dev/null

# Reload nginx to pick up DNS changes
echo "--- Reloading nginx ---"
docker exec rn-nginx nginx -s reload 2>&1 || echo "nginx reload failed, restarting..." && docker restart rn-nginx 2>/dev/null || true
sleep 2

# Test proxy
echo "--- Proxy Test ---"
curl -s -o /dev/null -w 'IM Hook HTTP: %{http_code}\n' -X POST http://localhost/imhook/feishu -H 'Content-Type: application/json' -d '{}'

echo ""
echo "=========================================="
echo " FIX COMPLETE"
echo "=========================================="
