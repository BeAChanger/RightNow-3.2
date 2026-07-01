#!/bin/bash
# Final nginx fix: clean stale include, restart nginx, verify
set -euo pipefail

NGINX_CONF=/etc/nginx/nginx.conf

# 1. Remove any stale imhook.conf include from previous fix3
sed -i '/imhook\.conf/d' $NGINX_CONF

# 2. Test config
nginx -t || { echo "CONFIG ERROR"; exit 1; }

# 3. Verify imhook location block is present
if grep -q 'location /imhook' $NGINX_CONF; then
  echo "OK: imhook location found"
else
  echo "ERROR: imhook location missing"
  grep -n 'location' $NGINX_CONF
fi

# 4. Restart nginx (try multiple methods)
systemctl restart nginx 2>/dev/null && echo "Restarted via systemctl" || \
  service nginx restart 2>/dev/null && echo "Restarted via service" || \
  { killall nginx 2>/dev/null; sleep 1; nginx; echo "Restarted via killall+start"; }

sleep 2

# 5. Verify nginx is running
pgrep nginx && echo "Nginx running"
curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost/imhook/feishu -H 'Content-Type: application/json' -d '{}'
echo ""
