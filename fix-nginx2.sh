#!/bin/bash
set -euo pipefail

# Remove the stale include line that references deleted imhook.conf
sed -i '/include.*imhook\.conf/d' /etc/nginx/nginx.conf

echo "=== Test config ==="
nginx -t 2>&1

echo "=== Reload ==="
nginx -s reload 2>&1
sleep 1

echo "=== Test ==="
curl -s -o /dev/null -w 'IM Hook HTTP: %{http_code}\n' http://localhost/imhook/feishu -X POST -H 'Content-Type: application/json' -d '{}'
