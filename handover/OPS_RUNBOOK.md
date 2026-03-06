# RightNow Fitness - 运维手册

**文档版本**: v1.0
**生成日期**: 2026-03-06
**适用环境**: 开发/测试/生产

---

## 目录

- [1. 基础设施概览](#1-基础设施概览)
- [2. 部署架构](#2-部署架构)
- [3. 配置管理](#3-配置管理)
- [4. 日常运维 SOP](#4-日常运维-sop)
- [5. 监控与告警](#5-监控与告警)
- [6. 故障排查指南](#6-故障排查指南)
- [7. 备份与恢复](#7-备份与恢复)
- [8. 安全与合规](#8-安全与合规)
- [9. 性能优化](#9-性能优化)
- [10. 应急响应](#10-应急响应)
- [11. 运维验收清单](#11-运维验收清单)

---

## 1. 基础设施概览

### 1.1 系统组件

| 组件 | 技术栈 | 端口 | 资源需求 | 状态 |
|------|--------|------|---------|------|
| 前端应用 | React + Vite | 5173 | 512MB RAM | 运行中 |
| 后端 API | NestJS | 5000 | 1GB RAM | 运行中 |
| 数据库 | PostgreSQL 15 | 15433 | 2GB RAM | 运行中 |
| RAG 服务 | Python FastAPI | 8000 | 1GB RAM | 运行中 |
| 向量数据库 | ChromaDB | - | 512MB RAM | 运行中 |

### 1.2 服务依赖关系

```mermaid
graph LR
    A[前端 5173] --> B[后端 API 5000]
    B --> C[PostgreSQL 15433]
    B --> D[RAG 服务 8000]
    B --> E[Gemini API]
    D --> F[ChromaDB]

    style A fill:#90EE90
    style B fill:#87CEEB
    style C fill:#FFB6C1
    style D fill:#DDA0DD
    style E fill:#F0E68C
    style F fill:#FFA07A
```

### 1.3 外部依赖

- **Google Gemini API**: AI 对话和图像识别
- **文件存储**: 本地文件系统 (生产环境建议使用 OSS/S3)
- **DNS**: (待配置)
- **CDN**: (待配置)

---

## 2. 部署架构

### 2.1 开发环境拓扑

```mermaid
graph TB
    subgraph "开发机器"
        A[前端 localhost:5173]
        B[后端 localhost:5000]
        C[RAG localhost:8000]
    end

    subgraph "Docker 容器"
        D[PostgreSQL<br/>localhost:15433]
    end

    subgraph "外部服务"
        E[Google Gemini API]
    end

    A --> B
    B --> D
    B --> C
    B --> E
    C --> E
```

### 2.2 生产环境架构 (建议)

```mermaid
graph TB
    subgraph "负载均衡层"
        LB[Nginx/ALB]
    end

    subgraph "应用层"
        FE1[前端实例 1]
        FE2[前端实例 2]
        BE1[后端实例 1]
        BE2[后端实例 2]
        RAG1[RAG 实例]
    end

    subgraph "数据层"
        DB[(PostgreSQL<br/>主从复制)]
        CACHE[(Redis<br/>缓存)]
        VDB[(ChromaDB)]
    end

    subgraph "存储层"
        OSS[对象存储<br/>OSS/S3]
    end

    LB --> FE1
    LB --> FE2
    LB --> BE1
    LB --> BE2
    BE1 --> DB
    BE2 --> DB
    BE1 --> CACHE
    BE2 --> CACHE
    BE1 --> RAG1
    BE2 --> RAG1
    RAG1 --> VDB
    BE1 --> OSS
    BE2 --> OSS
```

### 2.3 部署清单

**开发环境**:
- ✅ Docker Compose (PostgreSQL)
- ✅ npm scripts (前后端启动)
- ⚠️ 缺少自动化部署脚本

**生产环境 (待实施)**:
- ❌ CI/CD 流水线
- ❌ 容器编排 (Kubernetes/Docker Swarm)
- ❌ 负载均衡器
- ❌ 数据库主从复制
- ❌ Redis 缓存
- ❌ 对象存储集成

---

## 3. 配置管理

### 3.1 环境变量

#### 后端环境变量 (backend/.env)

```bash
# 数据库配置
DATABASE_URL="postgresql://postgres:postgres@localhost:15433/rightnow_fitness?schema=public"

# JWT 配置
JWT_SECRET="your-secret-key-change-in-production"  # ⚠️ 生产环境必须更换

# 服务配置
PORT=5000
HOST=0.0.0.0
CORS_ORIGIN="http://localhost:5173,http://localhost:5174"

# 外部服务
RAG_SERVICE_URL="http://localhost:8000"

# 种子数据 (仅开发环境)
ADMIN_SEED_EMAIL="admin@admin.com"
ADMIN_SEED_PASSWORD="123456"
ADMIN_SEED_NAME="RightNow Admin"
```

#### 前端环境变量 (frontend/.env.local)

```bash
# Gemini API
VITE_GEMINI_API_KEY="your-gemini-api-key"  # ⚠️ 不要提交到 Git
```

#### RAG 服务配置 (rag-service/config.py)

```python
# ChromaDB 配置
CHROMA_DB_PATH = "./chroma_db"

# Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# 服务配置
HOST = "0.0.0.0"
PORT = 8000
```

### 3.2 配置文件位置

| 配置文件 | 路径 | 用途 |
|---------|------|------|
| 后端环境变量 | `backend/.env` | 数据库、JWT、CORS |
| 前端环境变量 | `frontend/.env.local` | API 密钥 |
| 数据库配置 | `backend/docker-compose.yml` | PostgreSQL 容器 |
| Vite 配置 | `frontend/vite.config.ts` | 前端构建 |
| NestJS 配置 | `backend/src/main.ts` | 后端启动 |
| Prisma 配置 | `backend/prisma/schema.prisma` | 数据库 Schema |

### 3.3 Secrets 管理

⚠️ **重要**: 以下信息不得提交到版本控制:
- JWT_SECRET
- GEMINI_API_KEY
- 数据库密码
- 第三方 API 密钥

**建议方案**:
- 开发环境: `.env.local` (添加到 .gitignore)
- 生产环境: 使用密钥管理服务 (AWS Secrets Manager, HashiCorp Vault)

---

## 4. 日常运维 SOP

### 4.1 服务启动流程

#### 完整启动顺序

```bash
# 1. 启动 PostgreSQL (必须最先启动)
cd /path/to/RightNow-Fitness
npm run db:up
# 等待 10 秒确保数据库就绪

# 2. 验证数据库连接
npm run db:logs
# 查看日志确认 "database system is ready to accept connections"

# 3. 启动后端 API (新终端)
npm run dev:backend
# 等待看到 "Nest application successfully started"

# 4. 启动前端 (新终端)
npm run dev:frontend
# 等待看到 "Local: http://localhost:5173"

# 5. (可选) 启动 RAG 服务 (新终端)
npm run dev:rag
# 等待看到 "Application startup complete"
```

#### 快速启动 (使用脚本)

```bash
# Linux/Mac
./scripts/start-dev.sh

# Windows
.\scripts\start-dev.ps1
```

### 4.2 服务停止流程

```bash
# 1. 停止前端 (Ctrl+C)
# 2. 停止后端 (Ctrl+C)
# 3. 停止 RAG 服务 (Ctrl+C)
# 4. 停止 PostgreSQL
npm run db:down
```

### 4.3 服务重启流程

```bash
# 重启后端 (代码更改后)
# Ctrl+C 停止，然后重新运行
npm run dev:backend

# 重启数据库 (配置更改后)
npm run db:down
npm run db:up

# 重置数据库 (清空所有数据)
npm run db:down
docker volume rm backend_postgres_data  # 删除数据卷
npm run db:up
npm run db:init
```

### 4.4 日常检查清单

**每日检查** (5 分钟):
- [ ] 所有服务运行正常
- [ ] 数据库连接正常
- [ ] 磁盘空间充足 (>20%)
- [ ] 日志无严重错误

**每周检查** (15 分钟):
- [ ] 数据库备份完成
- [ ] 依赖包无安全漏洞 (`npm audit`)
- [ ] 日志文件清理
- [ ] 性能指标正常

**每月检查** (30 分钟):
- [ ] 系统更新
- [ ] 数据库优化 (VACUUM, ANALYZE)
- [ ] 备份恢复演练
- [ ] 容量规划评估

---

## 5. 监控与告警

### 5.1 监控指标

#### 应用层指标

| 指标 | 正常范围 | 告警阈值 | 监控方式 |
|------|---------|---------|---------|
| API 响应时间 | <500ms | >2s | ⚠️ 待实施 |
| API 错误率 | <1% | >5% | ⚠️ 待实施 |
| 并发用户数 | - | - | ⚠️ 待实施 |
| AI 响应时间 | <3s | >10s | ⚠️ 待实施 |

#### 系统层指标

| 指标 | 正常范围 | 告警阈值 | 监控方式 |
|------|---------|---------|---------|
| CPU 使用率 | <70% | >90% | ⚠️ 待实施 |
| 内存使用率 | <80% | >95% | ⚠️ 待实施 |
| 磁盘使用率 | <80% | >90% | ⚠️ 待实施 |
| 网络带宽 | - | - | ⚠️ 待实施 |

#### 数据库指标

| 指标 | 正常范围 | 告警阈值 | 监控方式 |
|------|---------|---------|---------|
| 连接数 | <50 | >80 | ⚠️ 待实施 |
| 慢查询 | 0 | >10/分钟 | ⚠️ 待实施 |
| 死锁 | 0 | >0 | ⚠️ 待实施 |
| 复制延迟 | <1s | >10s | ⚠️ 待实施 |

### 5.2 日志管理

#### 日志位置

```bash
# 后端日志 (控制台输出)
npm run dev:backend 2>&1 | tee logs/backend.log

# 数据库日志
npm run db:logs

# RAG 服务日志
# 查看 rag-service/ 目录下的日志文件
```

#### 日志级别

- **ERROR**: 严重错误，需要立即处理
- **WARN**: 警告信息，需要关注
- **INFO**: 一般信息
- **DEBUG**: 调试信息 (仅开发环境)

#### 日志清理策略

```bash
# 手动清理 (建议每周执行)
find logs/ -name "*.log" -mtime +7 -delete

# 或使用 logrotate (Linux)
# 配置文件: /etc/logrotate.d/rightnow-fitness
```

### 5.3 告警配置 (待实施)

**建议告警渠道**:
- 邮件通知
- 短信通知 (紧急情况)
- Slack/钉钉/企业微信

**告警规则示例**:
```yaml
# 示例配置 (需要集成监控系统)
alerts:
  - name: api_high_error_rate
    condition: error_rate > 5%
    duration: 5m
    severity: critical
    
  - name: database_connection_high
    condition: connections > 80
    duration: 2m
    severity: warning
```

---

## 6. 故障排查指南

### 6.1 常见问题速查表

| 问题 | 可能原因 | 解决方案 | 优先级 |
|------|---------|---------|--------|
| 前端无法访问 | 服务未启动 | `npm run dev:frontend` | P0 |
| API 502 错误 | 后端未启动 | `npm run dev:backend` | P0 |
| 数据库连接失败 | PostgreSQL 未启动 | `npm run db:up` | P0 |
| JWT 验证失败 | Token 过期或无效 | 重新登录获取新 Token | P1 |
| AI 响应超时 | Gemini API 限流 | 检查 API 配额，添加重试 | P1 |
| 文件上传失败 | 磁盘空间不足 | 清理磁盘空间 | P1 |

### 6.2 前端故障排查

#### 问题: 页面白屏

**排查步骤**:
```bash
# 1. 检查浏览器控制台错误
# 打开 DevTools (F12) 查看 Console 和 Network

# 2. 检查前端服务状态
curl http://localhost:5173

# 3. 检查后端 API 连接
curl http://localhost:5000

# 4. 重启前端服务
# Ctrl+C 停止
npm run dev:frontend
```

#### 问题: 3D 模型不显示

**排查步骤**:
```bash
# 1. 检查模型文件是否存在
ls -la frontend/public/models/

# 2. 检查浏览器 WebGL 支持
# 访问 https://get.webgl.org/

# 3. 清除浏览器缓存
# Ctrl+Shift+Delete

# 4. 检查控制台 Three.js 错误
```

### 6.3 后端故障排查

#### 问题: API 返回 500 错误

**排查步骤**:
```bash
# 1. 查看后端日志
# 检查终端输出的错误堆栈

# 2. 检查数据库连接
npm run db:logs

# 3. 验证环境变量
cat backend/.env

# 4. 重启后端服务
npm run dev:backend
```

#### 问题: Prisma 连接错误

**排查步骤**:
```bash
# 1. 检查数据库是否运行
docker ps | grep postgres

# 2. 测试数据库连接
docker exec -it <container_id> psql -U postgres -d rightnow_fitness

# 3. 重新生成 Prisma Client
cd backend
npm run prisma:generate

# 4. 推送 Schema
npm run prisma:push
```

### 6.4 数据库故障排查

#### 问题: 数据库无法启动

**排查步骤**:
```bash
# 1. 检查端口占用
netstat -an | grep 15433
# 或 Windows: netstat -ano | findstr 15433

# 2. 检查 Docker 状态
docker ps -a

# 3. 查看容器日志
npm run db:logs

# 4. 重启容器
npm run db:down
npm run db:up

# 5. 如果仍失败，删除数据卷重建
docker volume ls
docker volume rm backend_postgres_data
npm run db:up
npm run db:init
```

#### 问题: 慢查询

**诊断命令**:
```sql
-- 查看慢查询
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - pg_stat_activity.query_start > interval '5 seconds';

-- 查看表大小
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 查看索引使用情况
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
```

### 6.5 RAG 服务故障排查

#### 问题: RAG 服务无响应

**排查步骤**:
```bash
# 1. 检查服务状态
curl http://localhost:8000/docs

# 2. 查看 Python 进程
ps aux | grep uvicorn

# 3. 检查 ChromaDB 数据
ls -la rag-service/chroma_db/

# 4. 重启服务
# Ctrl+C 停止
npm run dev:rag
```

### 6.6 回滚操作

#### 代码回滚

```bash
# 1. 查看 Git 历史
git log --oneline -10

# 2. 回滚到指定提交
git reset --hard <commit-hash>

# 3. 重启服务
npm run dev:backend
npm run dev:frontend
```

#### 数据库回滚

```bash
# 1. 停止所有服务
npm run db:down

# 2. 恢复备份 (见备份章节)
docker exec -i <container_id> psql -U postgres -d rightnow_fitness < backup.sql

# 3. 重启服务
npm run db:up
```

---

## 7. 备份与恢复

### 7.1 数据库备份策略

#### 手动备份

```bash
# 创建备份目录
mkdir -p backups

# 备份数据库
docker exec <container_id> pg_dump -U postgres rightnow_fitness > backups/backup_$(date +%Y%m%d_%H%M%S).sql

# 验证备份文件
ls -lh backups/
```

#### 自动备份脚本

```bash
#!/bin/bash
# backup-db.sh

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CONTAINER_NAME="backend-postgres-1"

# 创建备份
docker exec $CONTAINER_NAME pg_dump -U postgres rightnow_fitness > $BACKUP_DIR/backup_$TIMESTAMP.sql

# 压缩备份
gzip $BACKUP_DIR/backup_$TIMESTAMP.sql

# 删除 7 天前的备份
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: backup_$TIMESTAMP.sql.gz"
```

#### 定时备份 (Cron)

```bash
# 编辑 crontab
crontab -e

# 每天凌晨 2 点备份
0 2 * * * /path/to/RightNow-Fitness/backup-db.sh >> /var/log/backup.log 2>&1
```

### 7.2 数据恢复流程

#### 完整恢复

```bash
# 1. 停止后端服务
# Ctrl+C

# 2. 恢复数据库
docker exec -i <container_id> psql -U postgres -d rightnow_fitness < backups/backup_20260306_020000.sql

# 3. 验证数据
docker exec -it <container_id> psql -U postgres -d rightnow_fitness -c "SELECT COUNT(*) FROM \"User\";"

# 4. 重启后端
npm run dev:backend
```

#### 部分恢复 (单表)

```bash
# 导出单表
docker exec <container_id> pg_dump -U postgres -t User rightnow_fitness > user_backup.sql

# 恢复单表
docker exec -i <container_id> psql -U postgres -d rightnow_fitness < user_backup.sql
```

### 7.3 文件备份

```bash
# 备份上传文件 (如果使用本地存储)
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz backend/uploads/

# 备份 RAG 向量数据库
tar -czf chroma_backup_$(date +%Y%m%d).tar.gz rag-service/chroma_db/
```

### 7.4 灾备演练

**每月执行**:
1. 从备份恢复到测试环境
2. 验证数据完整性
3. 测试应用功能
4. 记录恢复时间 (RTO)
5. 更新恢复文档

---

## 8. 安全与合规

### 8.1 安全检查清单

#### 应用安全

- [ ] JWT Secret 已更换为强密码 (生产环境)
- [ ] API 密钥不在代码库中
- [ ] CORS 配置正确 (仅允许可信域名)
- [ ] 文件上传有类型和大小限制
- [ ] SQL 注入防护 (Prisma ORM 已提供)
- [ ] XSS 防护 (React 已提供)
- [ ] CSRF 防护 (待实施)
- [ ] API 请求频率限制 (待实施)

#### 数据库安全

- [ ] 数据库密码强度足够
- [ ] 数据库不对外网开放
- [ ] 定期备份已启用
- [ ] 敏感数据已加密 (passwordHash)
- [ ] 数据库连接使用 SSL (生产环境)

#### 网络安全

- [ ] HTTPS 已启用 (生产环境)
- [ ] 防火墙规则配置正确
- [ ] 仅必要端口对外开放
- [ ] DDoS 防护已启用 (生产环境)

### 8.2 访问权限矩阵

| 角色 | 数据库 | 后端代码 | 前端代码 | 服务器 | 生产环境 |
|------|--------|---------|---------|--------|---------|
| 开发人员 | ✅ 读写 | ✅ 读写 | ✅ 读写 | ❌ | ❌ |
| 运维人员 | ✅ 读写 | ✅ 只读 | ✅ 只读 | ✅ 读写 | ✅ 读写 |
| 测试人员 | ✅ 只读 | ✅ 只读 | ✅ 只读 | ❌ | ❌ |
| 项目经理 | ❌ | ✅ 只读 | ✅ 只读 | ❌ | ❌ |

### 8.3 安全事件响应

#### 发现安全漏洞

1. 立即隔离受影响系统
2. 评估影响范围
3. 通知安全团队和管理层
4. 修复漏洞
5. 更新所有实例
6. 记录事件报告

#### 数据泄露响应

1. 立即停止服务
2. 确定泄露范围
3. 通知受影响用户
4. 修复安全漏洞
5. 加强监控
6. 提交合规报告

### 8.4 依赖安全审计

```bash
# 检查 npm 依赖漏洞
npm audit

# 修复可自动修复的漏洞
npm audit fix

# 查看详细报告
npm audit --json

# 检查 Python 依赖 (RAG 服务)
cd rag-service
pip list --outdated
```

---

## 9. 性能优化

### 9.1 前端性能优化

#### 已实施
- ✅ Vite 构建优化
- ✅ 代码分割 (动态导入)
- ✅ 图片懒加载

#### 待实施
- ⚠️ 3D 模型压缩和优化
- ⚠️ 图片 CDN 加速
- ⚠️ Service Worker 缓存
- ⚠️ 首屏加载优化

#### 优化建议

```typescript
// 1. 组件懒加载
const Dashboard = lazy(() => import('./views/Dashboard'));

// 2. 图片优化
<img loading="lazy" src="..." />

// 3. 使用 React.memo 避免重渲染
export const Component = React.memo(({ data }) => {
  // ...
});
```

### 9.2 后端性能优化

#### 数据库查询优化

```typescript
// 1. 使用 select 减少字段
const users = await prisma.user.findMany({
  select: { id: true, name: true, email: true }
});

// 2. 使用 include 优化关联查询
const posts = await prisma.post.findMany({
  include: { author: true, comments: true }
});

// 3. 添加索引 (已在 schema.prisma 中定义)
@@index([userId, date])
```

#### API 响应优化

```typescript
// 1. 实现分页
@Get()
async findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
  const skip = (page - 1) * limit;
  return this.service.findMany({ skip, take: limit });
}

// 2. 添加缓存 (待实施)
@UseInterceptors(CacheInterceptor)
@Get()
async findAll() {
  // ...
}
```

### 9.3 数据库性能优化

```sql
-- 1. 分析查询性能
EXPLAIN ANALYZE SELECT * FROM "User" WHERE email = 'test@example.com';

-- 2. 更新统计信息
ANALYZE;

-- 3. 清理死元组
VACUUM;

-- 4. 重建索引
REINDEX TABLE "User";
```

### 9.4 性能监控指标

| 指标 | 当前值 | 目标值 | 优化方案 |
|------|--------|--------|---------|
| 首屏加载时间 | - | <2s | 代码分割、CDN |
| API 响应时间 | - | <500ms | 缓存、索引优化 |
| 3D 模型加载 | - | <3s | 模型压缩、懒加载 |
| 数据库查询 | - | <100ms | 索引、查询优化 |

---

## 10. 应急响应

### 10.1 应急联系人

| 角色 | 姓名 | 联系方式 | 响应时间 |
|------|------|---------|---------|
| 技术负责人 | [待填写] | [待填写] | 15 分钟 |
| 运维负责人 | [待填写] | [待填写] | 30 分钟 |
| 数据库管理员 | [待填写] | [待填写] | 1 小时 |
| 项目经理 | [待填写] | [待填写] | 2 小时 |

### 10.2 应急响应流程

```mermaid
graph TD
    A[发现故障] --> B{严重程度}
    B -->|P0 严重| C[立即通知技术负责人]
    B -->|P1 高| D[30分钟内通知]
    B -->|P2 中| E[工作时间内处理]
    
    C --> F[启动应急预案]
    D --> F
    F --> G[定位问题]
    G --> H[实施修复]
    H --> I{修复成功?}
    I -->|是| J[恢复服务]
    I -->|否| K[执行回滚]
    K --> J
    J --> L[事后分析]
```

### 10.3 故障等级定义

| 等级 | 描述 | 响应时间 | 示例 |
|------|------|---------|------|
| P0 | 服务完全不可用 | 15 分钟 | 数据库崩溃、API 全部 500 |
| P1 | 核心功能不可用 | 30 分钟 | AI 对话失败、登录失败 |
| P2 | 部分功能异常 | 2 小时 | 图片上传慢、部分页面错误 |
| P3 | 轻微问题 | 1 天 | UI 显示问题、非关键功能 |

### 10.4 应急操作手册

#### 场景 1: 数据库崩溃

```bash
# 1. 检查数据库状态
docker ps -a | grep postgres

# 2. 查看日志
npm run db:logs

# 3. 尝试重启
npm run db:down
npm run db:up

# 4. 如果失败，从备份恢复
docker exec -i <container_id> psql -U postgres -d rightnow_fitness < backups/latest.sql

# 5. 验证恢复
npm run dev:backend
```

#### 场景 2: API 服务崩溃

```bash
# 1. 检查进程
ps aux | grep node

# 2. 查看日志
# 检查终端输出

# 3. 重启服务
npm run dev:backend

# 4. 如果持续失败，回滚代码
git log --oneline -5
git reset --hard <last-stable-commit>
npm run dev:backend
```

#### 场景 3: 磁盘空间不足

```bash
# 1. 检查磁盘使用
df -h

# 2. 查找大文件
du -sh * | sort -hr | head -10

# 3. 清理日志
find logs/ -name "*.log" -mtime +7 -delete

# 4. 清理 Docker
docker system prune -a

# 5. 清理 node_modules (如果必要)
find . -name "node_modules" -type d -prune -exec rm -rf '{}' +
npm install
```

---

## 11. 运维验收清单

### 11.1 环境验收

- [ ] 所有服务端口正常监听
- [ ] 数据库连接正常
- [ ] 环境变量配置正确
- [ ] 日志目录已创建
- [ ] 备份目录已创建
- [ ] 磁盘空间充足 (>50GB)

### 11.2 服务验收

- [ ] 前端服务正常启动
- [ ] 后端服务正常启动
- [ ] 数据库服务正常启动
- [ ] RAG 服务正常启动 (可选)
- [ ] 所有服务健康检查通过

### 11.3 监控验收

- [ ] 日志收集正常
- [ ] 监控指标采集正常 (待实施)
- [ ] 告警规则配置完成 (待实施)
- [ ] 告警通知渠道测试通过 (待实施)

### 11.4 备份验收

- [ ] 备份脚本测试通过
- [ ] 定时备份任务配置完成
- [ ] 备份文件可正常恢复
- [ ] 备份存储空间充足

### 11.5 安全验收

- [ ] JWT Secret 已更换
- [ ] API 密钥已配置
- [ ] 数据库密码强度足够
- [ ] 防火墙规则配置正确
- [ ] 依赖包安全审计通过

### 11.6 文档验收

- [ ] 阅读完本运维手册
- [ ] 理解服务启动流程
- [ ] 理解故障排查流程
- [ ] 理解备份恢复流程
- [ ] 理解应急响应流程

### 11.7 演练验收

- [ ] 服务启动/停止演练
- [ ] 数据库备份/恢复演练
- [ ] 故障排查演练
- [ ] 应急响应演练

---

## 附录

### A. 工具清单

| 工具 | 用途 | 访问方式 |
|------|------|---------|
| Docker Desktop | 容器管理 | 本地安装 |
| DBeaver/TablePlus | 数据库客户端 | 本地安装 |
| Postman/Insomnia | API 测试 | 本地安装 |
| VS Code | 代码编辑 | 本地安装 |

### B. 常用运维命令

```bash
# 查看服务状态
docker ps
ps aux | grep node

# 查看资源使用
top
htop
df -h
free -h

# 查看网络连接
netstat -tulpn
ss -tulpn

# 查看日志
tail -f logs/backend.log
docker logs -f <container_id>

# 数据库操作
docker exec -it <container_id> psql -U postgres -d rightnow_fitness
```

### C. 性能基准

| 指标 | 基准值 | 测试方法 |
|------|--------|---------|
| API 响应时间 | <500ms | `curl -w "@curl-format.txt" http://localhost:5000/api/users` |
| 数据库查询 | <100ms | `EXPLAIN ANALYZE SELECT ...` |
| 并发用户 | 100 | 使用 Apache Bench 或 k6 |

### D. 升级计划

**短期 (1 个月)**:
- [ ] 实施监控系统 (Prometheus + Grafana)
- [ ] 实施日志系统 (ELK Stack)
- [ ] 添加 API 限流
- [ ] 完成单元测试

**中期 (3 个月)**:
- [ ] 实施 CI/CD 流水线
- [ ] 数据库主从复制
- [ ] Redis 缓存集成
- [ ] 对象存储集成 (OSS/S3)

**长期 (6 个月)**:
- [ ] Kubernetes 容器编排
- [ ] 微服务拆分
- [ ] 多区域部署
- [ ] 自动扩缩容

---

**文档已优化为真人运维团队使用，可直接打印/分享**

**PDF 导出建议**: 使用 Markdown 转 PDF 工具 (如 Pandoc, Typora, VS Code Markdown PDF 插件)

**验收签字模板**:
```
交接方签字: ________________  日期: ________
接收方签字: ________________  日期: ________
```

