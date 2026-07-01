#!/bin/bash
# fix-nginx.sh — Add imhook location block inside existing server block
set -euo pipefail

echo "=== Fix Nginx imhook route ==="

# Remove the broken standalone location file
rm -f /etc/nginx/conf.d/imhook.conf

# Check current nginx config structure
echo "Current server blocks:"
grep -n 'server {\|location /' /etc/nginx/nginx.conf | head -20

# Add location /imhook/ inside the main server block
# Strategy: insert before the first 'location /' line, or before the closing '}' of the server block
if grep -q 'location /imhook' /etc/nginx/nginx.conf; then
  echo "imhook route already exists"
else
  # Find the line number of the first 'location /' directive (usually location / {)
  LOC_LINE=$(grep -n '^\s*location /' /etc/nginx/nginx.conf | head -1 | cut -d: -f1)

  if [ -n "$LOC_LINE" ]; then
    # Insert before the first location block
    sed -i "${LOC_LINE}i\\
    # 小爪 Feishu webhook proxy\\
    location /imhook/ {\\
        proxy_pass http://127.0.0.1:18789;\\
        proxy_http_version 1.1;\\
        proxy_set_header Host \$host;\\
        proxy_set_header X-Real-IP \$remote_addr;\\
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;\\
        proxy_read_timeout 120s;\\
    }\\
" /etc/nginx/nginx.conf
    echo "Inserted imhook location before line $LOC_LINE"
  else
    echo "ERROR: Could not find 'location /' directive"
    grep -n 'location' /etc/nginx/nginx.conf
    exit 1
  fi
fi

echo ""
echo "=== Testing config ==="
nginx -t 2>&1

echo ""
echo "=== Reloading ==="
nginx -s reload 2>&1
sleep 1

echo ""
echo "=== Test ==="
curl -s -o /dev/null -w 'IM Hook HTTP: %{http_code}\n' http://localhost/imhook/feishu -X POST -H 'Content-Type: application/json' -d '{}'
curl -s http://localhost/imhook/feishu -X POST -H 'Content-Type: application/json' -d '{"challenge":"test123","token":"x"}'

echo ""
echo "=== DONE ==="
