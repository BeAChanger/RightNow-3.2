#!/bin/bash
# Pure nginx reload — no kill, no PID hunting
set -euo pipefail

sed -i '/imhook\.conf/d' /etc/nginx/nginx.conf
nginx -t
nginx -s quit 2>/dev/null || true
sleep 2
nginx
sleep 1
curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost/imhook/feishu -H 'Content-Type: application/json' -d '{}'
echo ""
