#!/bin/bash
set -euo pipefail
cd /root/rightnow

TOKEN=$(grep '^AGENT_SERVICE_TOKEN=' .env | head -1 | cut -d= -f2-)
FEISHU_ID=$(grep '^FEISHU_APP_ID=' .env | head -1 | cut -d= -f2-)
FEISHU_SEC=$(grep '^FEISHU_APP_SECRET=' .env | head -1 | cut -d= -f2-)
LLM_KEY=$(grep '^STEPFUN_API_KEY=' .env | head -1 | cut -d= -f2-)

# Extract updated source (overwrites openclaw-agent/)
tar -xzf xiaozhua-src.tar.gz

# Rebuild
docker build -t rightnow-xiaozhua:latest -f openclaw-agent/Dockerfile openclaw-agent/

# Stop old, start new with port publish
docker stop rn-openclaw-agent 2>/dev/null || true
docker rm rn-openclaw-agent 2>/dev/null || true

docker run -d \
  --name rn-openclaw-agent \
  --network rightnow_default \
  --network-alias openclaw-agent \
  -p 127.0.0.1:18789:18789 \
  --restart unless-stopped \
  -e NODE_ENV=production -e PORT=18789 \
  -e "RIGHTNOW_API_BASE=http://rn-backend:5000/api" \
  -e "AGENT_SERVICE_TOKEN=$TOKEN" \
  -e "OPENCLAW_LLM_BASE_URL=https://api.stepfun.com/v1" \
  -e "OPENCLAW_LLM_API_KEY=$LLM_KEY" \
  -e "OPENCLAW_LLM_MODEL=step-2-16k" \
  -e "FEISHU_APP_ID=$FEISHU_ID" \
  -e "FEISHU_APP_SECRET=$FEISHU_SEC" \
  -e "FEISHU_SUBSCRIPTION_MODE=${FEISHU_SUBSCRIPTION_MODE:-websocket}" \
  rightnow-xiaozhua:latest

sleep 4

# Test
docker logs rn-openclaw-agent --tail 10
echo "---"
curl -s -X POST http://localhost/imhook/feishu -H 'Content-Type: application/json' -d '{"challenge":"test","token":"x"}' | head -c 200
echo ""
curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X POST http://localhost/imhook/feishu -H 'Content-Type: application/json' -d '{}'
