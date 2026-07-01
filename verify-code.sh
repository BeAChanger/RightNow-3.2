#!/bin/bash
echo "=== Server.js first 15 lines ==="
docker exec rn-openclaw-agent head -15 /app/src/server.js

echo ""
echo "=== Check if express.raw is used ==="
docker exec rn-openclaw-agent grep -n 'express.raw\|express.text\|express.json' /app/src/server.js

echo ""
echo "=== Container logs (last 5) ==="
docker logs rn-openclaw-agent --tail 5

echo ""
echo "=== Direct test to gateway port ==="
curl -s -v -X POST http://localhost:18789/imhook/feishu -H 'Content-Type: application/json' -d '{}' 2>&1 | head -20
