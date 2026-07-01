#!/bin/bash
# deploy-xiaozhua.sh — Deploy real 小爪 Gateway (replace alpine placeholder)
# Run on server: bash deploy-xiaozhua.sh

set -euo pipefail
cd /root/rightnow
START_TS=$(date +%s)

echo "=========================================="
echo " 小爪 Gateway Deployment"
echo " $(date)"
echo "=========================================="

# ── Helper: safely read a value from .env ──
env_get() {
    grep "^${1}=" .env 2>/dev/null | head -1 | cut -d= -f2- || true
}

# ── 1. Write missing vars to .env ──
added=0
for VAR in \
    "AGENT_SERVICE_TOKEN=$(python3 -c "import secrets; print(secrets.token_hex(32))")" \
    "FEISHU_APP_ID=${FEISHU_APP_ID:-}" \
    "FEISHU_APP_SECRET=${FEISHU_APP_SECRET:-}"
do
    key="${VAR%%=*}"
    if ! grep -q "^${key}=" .env 2>/dev/null; then
        echo "$VAR" >> .env
        echo "[OK] ${key} added to .env"
        added=1
    fi
done

# Re-read values (fresh from .env)
AGENT_SERVICE_TOKEN=$(env_get AGENT_SERVICE_TOKEN)
FEISHU_APP_ID=$(env_get FEISHU_APP_ID)
FEISHU_APP_SECRET=$(env_get FEISHU_APP_SECRET)
STEPFUN_API_KEY=$(env_get STEPFUN_API_KEY)

echo ""
echo "=== Critical Env Vars ==="
echo "AGENT_SERVICE_TOKEN: ${AGENT_SERVICE_TOKEN:0:8}..."
echo "FEISHU_APP_ID: ${FEISHU_APP_ID:0:8}..."
echo "FEISHU_APP_SECRET: ${FEISHU_APP_SECRET:0:4}..."
echo "STEPFUN_API_KEY: ${STEPFUN_API_KEY:0:8}..."
echo ""

# ── 2. Stop & remove old containers ──
echo "[ACTION] Stopping old containers..."
docker stop openclaw-agent 2>/dev/null || true
docker rm -f openclaw-agent 2>/dev/null || true
docker rm -f rn-openclaw-agent 2>/dev/null || true
echo "[OK] Old containers removed"

# ── 3. Build new 小爪 image ──
echo "[ACTION] Building xiaozhua gateway image..."
docker build \
    -t rightnow-xiaozhua:latest \
    -f ./openclaw-agent/Dockerfile \
    ./openclaw-agent
echo "[OK] Image built"

# ── 4. Restart backend to pick up latest AGENT_SERVICE_TOKEN ──
echo "[ACTION] Restarting backend to sync AGENT_SERVICE_TOKEN..."
docker compose up -d backend 2>/dev/null || docker restart rn-backend 2>/dev/null || true
echo "[OK] Backend restarted"
sleep 5

# ── 5. Start real 小爪 container (with network-alias for nginx) ──
echo "[ACTION] Starting xiaozhua container..."
docker run -d \
    --name rn-openclaw-agent \
    --network rightnow_default \
    --network-alias openclaw-agent \
    -p 127.0.0.1:18789:18789 \
    --restart unless-stopped \
    -e NODE_ENV=production \
    -e PORT=18789 \
    -e RIGHTNOW_API_BASE="http://rn-backend:5000/api" \
    -e AGENT_SERVICE_TOKEN="${AGENT_SERVICE_TOKEN}" \
    -e OPENCLAW_LLM_BASE_URL="https://api.stepfun.com/v1" \
    -e OPENCLAW_LLM_API_KEY="${STEPFUN_API_KEY}" \
    -e OPENCLAW_LLM_MODEL="step-2-16k" \
    -e FEISHU_APP_ID="${FEISHU_APP_ID}" \
    -e FEISHU_APP_SECRET="${FEISHU_APP_SECRET}" \
    -e FEISHU_SUBSCRIPTION_MODE="${FEISHU_SUBSCRIPTION_MODE:-websocket}" \
    rightnow-xiaozhua:latest

echo "[OK] Container started"

# ── 6. Wait for startup ──
sleep 4

# ── 7. Verify ──
echo ""
echo "=== Verification ==="

# Container status
echo "--- Container ---"
docker ps --filter name=rn-openclaw-agent --format '{{.Names}} {{.Status}} {{.Image}}'

# Container logs
echo ""
echo "--- Logs (last 15 lines) ---"
docker logs rn-openclaw-agent --tail 15 2>&1

# Health check
echo ""
echo "--- Health Check ---"
HEALTH=$(docker exec rn-openclaw-agent curl -s http://localhost:18789/health 2>&1 || echo "FAILED")
echo "$HEALTH"

# RPC test from inside container
echo ""
echo "--- RPC Test (internal) ---"
docker exec rn-openclaw-agent curl -s -X POST http://rn-backend:5000/api/agent/rpc \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${AGENT_SERVICE_TOKEN}" \
    -d '{"channel":"test","channelUserId":"test123","tool":"user.profile.get","args":{}}' 2>&1 || echo "RPC_FAILED"

# External proxy check
echo ""
echo "--- Nginx Proxy ---"
echo -n "IM Hook: "; curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost/imhook/feishu -H 'Content-Type: application/json' -d '{}'
echo ""

echo ""
echo "=========================================="
echo " Deployment completed in $(( $(date +%s) - START_TS ))s"
echo "=========================================="
