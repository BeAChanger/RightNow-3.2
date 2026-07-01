#!/bin/bash
sed -i '/imhook\.conf/d' /etc/nginx/nginx.conf
nginx -t
nginx -s reload
sleep 1
curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost/imhook/feishu -H 'Content-Type: application/json' -d '{}'
echo ""
