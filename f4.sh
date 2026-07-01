#!/bin/bash
# Self-running nginx fix — triggered by cron
set -euo pipefail

LOG=/root/rightnow/nginx-fix.log
exec > "$LOG" 2>&1

echo "=== $(date) ==="

# Remove stale include
sed -i '/imhook\.conf/d' /etc/nginx/nginx.conf

# Test config
nginx -t || { echo "CONFIG FAIL"; exit 1; }
grep -q 'location /imhook' /etc/nginx/nginx.conf && echo "OK: imhook present"

# Kill and restart nginx
PID=$(ps aux | grep 'nginx: master' | grep -v grep | awk '{print $2}' | head -1)
[ -n "$PID" ] && { kill "$PID" 2>/dev/null; sleep 2; kill -9 "$PID" 2>/dev/null; sleep 1; }
nginx
sleep 1

# Test
RESULT=$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost/imhook/feishu -H 'Content-Type: application/json' -d '{}')
echo "IM Hook HTTP: $RESULT"

# Remove the cron job (self-cleanup)
rm -f /etc/cron.d/xiaozhua-nginx-fix
echo "Cron job removed. Done."
