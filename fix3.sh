#!/bin/bash
# fix3.sh — Final fix: add AGENT_SERVICE_TOKEN to backend + configure nginx
set -euo pipefail
cd /root/rightnow

TOKEN=$(grep '^AGENT_SERVICE_TOKEN=' .env | head -1 | cut -d= -f2-)
echo "Token length: $(echo -n "$TOKEN" | wc -c)"

# ── 1. Force-recreate backend with updated compose file ──
echo ""
echo "=== 1. Recreate backend ==="
docker compose -f docker-compose.prod.yml up -d --force-recreate backend 2>&1
sleep 6
echo -n "Backend AGENT_SERVICE_TOKEN len: "
docker exec rn-backend sh -c 'echo -n $AGENT_SERVICE_TOKEN | wc -c'

# ── 2. Test RPC ──
echo ""
echo "=== 2. RPC Test ==="
docker exec rn-openclaw-agent curl -s -X POST http://rn-backend:5000/api/agent/rpc \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"channel":"test","channelUserId":"test123","tool":"user.profile.get","args":{}}'

# ── 3. Fix nginx ──
echo ""
echo "=== 3. Fix Nginx ==="

# Find where nginx config lives
NGINX_CONF=""
for f in /etc/nginx/conf.d/default.conf /etc/nginx/sites-enabled/default /etc/nginx/nginx.conf; do
  if [ -f "$f" ]; then echo "Found: $f"; NGINX_CONF="$f"; break; fi
done

# Check if imhook proxy rule exists
if grep -q 'imhook\|18789' "$NGINX_CONF" 2>/dev/null; then
  echo "imhook route already in nginx config"
else
  echo "Adding imhook route to nginx..."

  # Create/update conf
  cat > /etc/nginx/conf.d/imhook.conf << 'NGINXEOF'
# 小爪 Feishu webhook proxy
location /imhook/ {
    proxy_pass http://127.0.0.1:18789;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout 120s;
}
NGINXEOF

  # Ensure it's included in the main config
  if ! grep -q 'imhook.conf' /etc/nginx/nginx.conf 2>/dev/null; then
    # Add include before the last }
    sed -i 's/^}/\n    include \/etc\/nginx\/conf.d\/imhook.conf;\n}/' /etc/nginx/nginx.conf 2>/dev/null || true
  fi

  echo "Config created, testing..."
  nginx -t 2>&1
  echo "Reloading nginx..."
  nginx -s reload 2>&1 || systemctl reload nginx 2>&1 || service nginx reload 2>&1
  sleep 1
fi

# ── 4. Test nginx proxy ──
echo ""
echo "=== 4. Proxy Test ==="
curl -s -o /dev/null -w 'IM Hook HTTP: %{http_code}\n' http://localhost/imhook/feishu -X POST -H 'Content-Type: application/json' -d '{}'

echo ""
echo "=== DONE ==="
