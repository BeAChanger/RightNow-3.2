# 部署流程

## 开发环境

```bash
# 前端
cd frontend
npm run dev

# 后端
cd backend
npm run start:dev
```

## 生产构建

```bash
# 前端
cd frontend
npm run build

# 后端
cd backend
npm run build
```

## 环境变量

### 前端 (.env.local)
```
VITE_API_URL=http://localhost:3100
VITE_GEMINI_API_KEY=your_key
```

### 后端 (.env)
```
DATABASE_URL=postgresql://...
JWT_SECRET=your_secret
GEMINI_API_KEY=your_key
```

## 部署检查

- [ ] 环境变量配置
- [ ] 数据库迁移
- [ ] 静态资源上传
- [ ] 健康检查通过
