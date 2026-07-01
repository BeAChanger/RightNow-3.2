#!/bin/bash
# RightNow P0 Agent 部署 Phase 2
set -e
cd /root/rightnow

echo "============================================"
echo " Phase 2: DB Push + Container Rebuild"
echo "============================================"

echo ""
echo ">>> [1/3] 推送数据库Schema..."
docker compose --env-file .env -f docker-compose.prod.yml run --rm backend npx prisma db push --skip-generate
echo "DB Schema推送完成"

echo ""
echo ">>> [2/3] 重建并重启后端..."
docker compose --env-file .env -f docker-compose.prod.yml build backend 2>&1 | tail -5
docker compose --env-file .env -f docker-compose.prod.yml up -d backend
sleep 5
echo "后端容器已重启"

echo ""
echo ">>> [3/3] 重建并重启前端..."
docker compose --env-file .env -f docker-compose.prod.yml build frontend 2>&1 | tail -5
docker compose --env-file .env -f docker-compose.prod.yml up -d frontend
sleep 3
echo "前端容器已重启"

echo ""
echo "============================================"
echo " Smoke Tests"
echo "============================================"

echo ""
echo "容器状态:"
docker compose --env-file .env -f docker-compose.prod.yml ps --format 'table {{.Name}}\t{{.Status}}'

echo ""
echo "Agent RPC (expect 401):"
curl -s -o /dev/null -w "HTTP %{http_code}" http://127.0.0.1:5000/api/agent/rpc
echo ""

echo "Bindings POST (expect 401):"
curl -s -o /dev/null -w "HTTP %{http_code}" -X POST http://127.0.0.1:5000/api/agent/bindings/code
echo ""

echo "Web / (expect 200):"
curl -s -o /dev/null -w "HTTP %{http_code}" http://127.0.0.1/
echo ""

echo "Web HTTPS (expect 200):"
curl -s -o /dev/null -w "HTTP %{http_code}" https://shuaijun.cn/ -k
echo ""

echo ""
echo "=== DEPLOY COMPLETE ==="
