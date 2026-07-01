#!/bin/bash
# RightNow P0 Agent Deployment Script
# Run on server: bash /root/rightnow/deploy-agent-p0.sh

set -e
cd /root/rightnow

echo "============================================"
echo " RightNow P0 Agent 身份桥部署"
echo " $(date)"
echo "============================================"

# 1. Backup
echo ""
echo ">>> [1/6] 备份现有文件..."
mkdir -p backups/agent-p0-$(date +%Y%m%d-%H%M%S)
BACKUP_DIR=$(ls -dt backups/agent-p0-* | head -1)
cp backend/prisma/schema.prisma "$BACKUP_DIR/"
cp backend/src/app.module.ts "$BACKUP_DIR/"
cp backend/src/users/users.module.ts "$BACKUP_DIR/"
cp docker-compose.prod.yml "$BACKUP_DIR/"
cp nginx.conf "$BACKUP_DIR/"
[ -d backend/src/agent ] && cp -r backend/src/agent "$BACKUP_DIR/"
echo "  备份到: $BACKUP_DIR"

# 2. Extract deployment package
echo ""
echo ">>> [2/6] 解压部署包..."
tar xzf agent-p0-deploy-20260628.tar.gz
echo "  解压完成"

# 3. Verify new files
echo ""
echo ">>> [3/6] 验证新文件..."
echo "  Agent模块文件:"
ls -la backend/src/agent/agent.module.ts
echo "  OpenClaw扩展:"
ls -la openclaw-agent/extensions/rightnow/index.ts
echo "  前端绑定页面:"
ls -la frontend/views/BindXiaozhua.tsx
echo "  文件验证: 全部存在"

# 4. Push database schema
echo ""
echo ">>> [4/6] 推送数据库Schema (新增3张Agent表)..."
docker compose -f docker-compose.prod.yml run --rm backend npx prisma db push --skip-generate
echo "  DB Schema推送完成"

# 5. Rebuild & restart backend
echo ""
echo ">>> [5/6] 重建并重启后端容器..."
docker compose -f docker-compose.prod.yml build backend
docker compose -f docker-compose.prod.yml up -d backend
sleep 5
echo "  后端容器已重启"

# 6. Rebuild & restart frontend
echo ""
echo ">>> [6/6] 重建并重启前端容器..."
docker compose -f docker-compose.prod.yml build frontend
docker compose -f docker-compose.prod.yml up -d frontend
sleep 3
echo "  前端容器已重启"

# Smoke tests
echo ""
echo "============================================"
echo " Smoke Tests"
echo "============================================"

echo ""
echo "1. 容器状态:"
docker compose -f docker-compose.prod.yml ps --format 'table {{.Name}}\t{{.Status}}'

echo ""
echo "2. Agent RPC接口 (期望401-无token):"
RPC_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/api/agent/rpc)
echo "   GET /api/agent/rpc -> HTTP $RPC_STATUS"
if [ "$RPC_STATUS" = "401" ]; then
  echo "   ✅ RPC接口受保护，正确"
else
  echo "   ⚠️ 期望401，实际 $RPC_STATUS"
fi

echo ""
echo "3. Web访问 (期望200):"
WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/)
echo "   GET / -> HTTP $WEB_STATUS"
if [ "$WEB_STATUS" = "200" ]; then
  echo "   ✅ Web可访问"
else
  echo "   ⚠️ 期望200，实际 $WEB_STATUS"
fi

echo ""
echo "4. 绑定码生成接口 (期望401-需用户JWT):"
BIND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/api/agent/bindings/code -X POST)
echo "   POST /api/agent/bindings/code -> HTTP $BIND_STATUS"
if [ "$BIND_STATUS" = "401" ]; then
  echo "   ✅ 绑定接口受JWT保护，正确"
else
  echo "   ⚠️ 期望401，实际 $BIND_STATUS"
fi

echo ""
echo "============================================"
echo " 部署完成!"
echo "============================================"
echo ""
echo "提醒:"
echo "  1. 确保 .env 中已配置 AGENT_SERVICE_TOKEN"
echo "  2. 绑定小爪页面: https://shuaijun.cn → 右上角菜单 → 绑定小爪"
echo "  3. OpenClaw小爪容器需在配置IM通道后单独启动"
echo "  4. 回滚: 从 $BACKUP_DIR 恢复文件后重建容器"
