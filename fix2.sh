#!/bin/bash
set -euo pipefail
cd /root/rightnow

TOKEN=$(grep '^AGENT_SERVICE_TOKEN=' .env | head -1 | cut -d= -f2-)

echo "=== 1. Force-recreate backend ==="
docker compose -f docker-compose.prod.yml up -d --force-recreate backend
sleep 6
echo -n "Backend token len: "
docker exec rn-backend sh -c 'echo -n $AGENT_SERVICE_TOKEN | wc -c'

echo ""
echo "=== 2. Find nginx ==="
docker ps --format '{{.Names}} {{.Image}} {{.Status}}' | grep -i nginx || echo "No nginx container running"
docker ps -a --format '{{.Names}} {{.Image}} {{.Status}}' | grep -i nginx || echo "No nginx container at all"
echo "Host nginx processes:"
ps aux | grep -i nginx | grep -v grep || echo "No host nginx process"

echo ""
echo "=== 3. RPC Test ==="
docker exec rn-openclaw-agent curl -s -X POST http://rn-backend:5000/api/agent/rpc \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"channel":"test","channelUserId":"test123","tool":"user.profile.get","args":{}}'

echo ""
echo "=== 4. Nginx Proxy Test ==="
curl -s -o /dev/null -w 'IM Hook HTTP: %{http_code}\n' http://localhost/imhook/feishu -X POST -H 'Content-Type: application/json' -d '{}'

echo ""
echo "=== Done ==="
