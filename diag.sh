#!/bin/bash
# Diagnose: why is imhook returning 404 despite location being present?
set -euo pipefail

echo "=== Nginx config structure (server blocks + listen) ==="
grep -n 'server {\|listen \|location /' /etc/nginx/nginx.conf | head -20

echo ""
echo "=== imhook location context (5 lines around) ==="
grep -n -B5 -A5 'imhook' /etc/nginx/nginx.conf

echo ""
echo "=== Is imhook location inside the right server? ==="
awk '/server \{/{in_server=1; line=NR} /location \/imhook/{if(in_server) print "imhook found in server starting at line " line " (current " NR ")"} /\}/{in_server=0}' /etc/nginx/nginx.conf

echo ""
echo "=== What does curl return with verbose? ==="
curl -s -v -X POST http://localhost/imhook/feishu -H 'Content-Type: application/json' -d '{}' 2>&1 | head -20

echo ""
echo "=== Check if port 18789 has imhook endpoint ==="
curl -s http://localhost:18789/health 2>&1
curl -s -X POST http://localhost:18789/imhook/feishu -H 'Content-Type: application/json' -d '{}' 2>&1 | head -5
