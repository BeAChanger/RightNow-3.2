# RightNow Fitness 本地启动指南

本文档给你一套可直接复制执行的启动命令（Windows PowerShell）。

## 1. 一次性准备

在项目根目录 `E:\rightnow-fitness (1)` 执行：

```powershell
npm install
npm --prefix ./rightnow-api install
```

## 2. 启动数据库（Docker）

```powershell
npm run db:up
npm run db:init
```

说明：
- `db:up` 启动 PostgreSQL 容器。
- `db:init` 会执行 Prisma push + seed。

## 3. 同步 Prisma Client（重要）

如果后端出现 Prisma 类型不匹配（例如 `targetBodyFatEstimate` / `isVisualAssessment` 之类报错），先执行：

```powershell
npm --prefix ./rightnow-api run prisma:generate
```

如果报 `EPERM ... query_engine-windows.dll.node`（被占用），先停止占用 3000 端口的后端进程，再重试：

```powershell
$pid = (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess)
if ($pid) { Stop-Process -Id $pid -Force }
npm --prefix ./rightnow-api run prisma:generate
```

## 4. 启动后端（开发模式）

```powershell
npm run dev:api
```

默认端口：`http://localhost:3000`

## 5. 启动前端（开发模式）

新开一个终端执行：

```powershell
npm run dev
```

默认端口：`http://localhost:5173`

说明：
- 如果 5173 被占用，Vite 会自动改用 5174、5175 等端口。

## 6. 快速检查是否启动成功

```powershell
Get-NetTCPConnection -LocalPort 3000,5173,5174,5175 -State Listen -ErrorAction SilentlyContinue | Select-Object LocalAddress,LocalPort,OwningProcess
```

## 7. 常用“清端口”命令

### 清理 3000（后端）

```powershell
$pid = (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess)
if ($pid) { Stop-Process -Id $pid -Force }
```

### 清理 5173（前端）

```powershell
$pid = (Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess)
if ($pid) { Stop-Process -Id $pid -Force }
```

## 8. 生产模式（可选）

```powershell
npm run build
npm run build:api
node .\rightnow-api\dist\main.js
```

## 9. 停止服务

- 前端/后端开发服务：在对应终端按 `Ctrl + C`
- 数据库容器：

```powershell
npm run db:down
```
