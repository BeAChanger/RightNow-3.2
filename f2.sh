#!/bin/bash
# Remove stale include, reload nginx via HUP signal
sed -i '/imhook\.conf/d' /etc/nginx/nginx.conf
nginx -t 2>&1
# Reload via master process signal (bypass PID file issue)
kill -HUP $(cat /var/run/nginx.pid 2>/dev/null || pgrep -f 'nginx: master' | head -1)
sleep 2
# Verify
curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost/imhook/feishu -H 'Content-Type: application/json' -d '{}'
echo ""
