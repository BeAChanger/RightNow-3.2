#!/bin/bash
echo "=== Gateway Logs ==="
docker logs rn-openclaw-agent --tail 20 2>&1

echo ""
echo "=== RPC Test ==="
TOKEN=$(grep '^AGENT_SERVICE_TOKEN=' /root/rightnow/.env | head -1 | cut -d= -f2-)
docker exec rn-openclaw-agent curl -s -X POST http://rn-backend:5000/api/agent/rpc \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"channel":"test","channelUserId":"test123","tool":"user.profile.get","args":{}}'

echo ""
echo "=== StepFun API Test ==="
docker exec rn-openclaw-agent curl -s -X POST https://api.stepfun.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(grep '^STEPFUN_API_KEY=' /root/rightnow/.env | head -1 | cut -d= -f2-)" \
  -d '{"model":"step-2-16k","messages":[{"role":"user","content":"Hi"}],"max_tokens":20}' | head -c 300

echo ""
echo "=== Proxy Test ==="
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost/imhook/feishu -H 'Content-Type: application/json' -d '{}'
