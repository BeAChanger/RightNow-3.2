#!/bin/bash
# PID was written to wrong file (/run/nginx.pid;). Fix path.
set -euo pipefail

# Remove stale include
sed -i '/imhook\.conf/d' /etc/nginx/nginx.conf
nginx -t

# Read PID from the file with semicolon (written by f6)
PID=$(cat /run/nginx.pid\; 2>/dev/null || ps aux | awk '/nginx: master/{print $2; exit}')
echo "PID=$PID"

# Write to CORRECT path (no semicolon)
echo "$PID" > /run/nginx.pid
cat /run/nginx.pid

# Reload
nginx -s reload 2>&1
sleep 1

# Test
RESULT=$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost/imhook/feishu -H 'Content-Type: application/json' -d '{}')
echo "HTTP: $RESULT"
