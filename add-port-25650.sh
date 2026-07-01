#!/bin/bash
# Add port 25650 to nginx for Feishu webhook (shuaijun.cn ICP pending)
set -euo pipefail

echo "=== Adding port 25650 to nginx ==="

if grep -q 'listen.*25650' /etc/nginx/nginx.conf; then
  echo "Port 25650 already configured"
else
  sed -i '/listen       80;/a\        listen       25650;' /etc/nginx/nginx.conf
  echo "Added listen 25650"

  nginx -t

  # Fix PID file and reload
  PS_PID=$(ps aux | awk '/nginx: master/{print $2; exit}')
  echo "$PS_PID" > /run/nginx.pid
  nginx -s reload
  echo "Reloaded"
fi

sleep 1

echo ""
echo "=== Test ==="
curl -s -X POST http://103.236.92.40:25650/imhook/feishu \
  -H 'Content-Type: application/json' \
  -d '{"challenge":"test123","token":"x"}'
echo ""

# Also verify HTTP code
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST http://103.236.92.40:25650/imhook/feishu \
  -H 'Content-Type: application/json' \
  -d '{}')
echo "HTTP: $CODE"
echo "DONE"
