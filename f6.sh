#!/bin/bash
# Fix: diagnose PID file, fix it, then reload
set -euo pipefail

sed -i '/imhook\.conf/d' /etc/nginx/nginx.conf
nginx -t

# Find nginx PID file location from config
PID_FILE=$(grep -Po 'pid\s+\K\S+' /etc/nginx/nginx.conf 2>/dev/null || echo "")
echo "PID file from config: '${PID_FILE:-not set, default /run/nginx.pid}'"

# Default locations
for pf in "$PID_FILE" /run/nginx.pid /var/run/nginx.pid; do
  [ -z "$pf" ] && continue
  echo "Testing: $pf (exists: $([ -f "$pf" ] && echo yes || echo no))"
  [ -f "$pf" ] && echo "  content: '$(cat "$pf" 2>/dev/null || echo "empty")'" || true
done

# Find nginx master via ps
PS_PID=$(ps aux | awk '/nginx: master/{print $2; exit}')
echo "Nginx master PID from ps: '${PS_PID:-none}'"

# If we found a PID but the pid file is wrong, fix it
if [ -n "$PS_PID" ] && [ -n "$PS_PID" ]; then
  PID_DIR=$(dirname "${PID_FILE:-/run/nginx.pid}")
  echo "$PS_PID" > "${PID_FILE:-/run/nginx.pid}" 2>/dev/null && echo "Wrote PID to ${PID_FILE:-/run/nginx.pid}" || echo "Could not write PID file to ${PID_FILE:-/run/nginx.pid}"

  # Try reload now
  nginx -s reload 2>&1 || echo "reload failed, trying alternate..."
  sleep 1
fi

# Test
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost/imhook/feishu -H 'Content-Type: application/json' -d '{}'
echo "DONE"
