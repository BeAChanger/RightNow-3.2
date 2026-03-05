# API文档导航

## 基础信息

- **Base URL**: `http://localhost:3100` (开发环境)
- **认证方式**: JWT Bearer Token
- **请求格式**: JSON
- **响应格式**: JSON

## 接口分类

### [认证接口](AUTH.md)
- 用户注册
- 用户登录
- Token刷新
- 用户信息

### [饮食接口](DIET.md)
- 创建饮食记录
- 获取饮食列表
- 拍照识别
- 营养统计

### [社区接口](COMMUNITY.md)
- 发布动态
- 获取动态列表
- 点赞评论
- 打卡记录

### [AI教练接口](AI_COACH.md)
- 对话接口
- 生成计划
- 获取建议
- 历史记录

### [通用规范](COMMON.md)
- 错误码
- 分页规范
- 响应格式
- 请求头

## 快速开始

```bash
# 获取Token
curl -X POST http://localhost:3100/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# 使用Token调用API
curl http://localhost:3100/api/diet \
  -H "Authorization: Bearer YOUR_TOKEN"
```
