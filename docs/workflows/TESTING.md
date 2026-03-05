# 测试规范

## 测试类型

### 单元测试
测试单个函数或方法

```typescript
describe('DietService', () => {
  it('should create diet record', async () => {
    const result = await dietService.create(userId, data);
    expect(result.id).toBeDefined();
  });
});
```

### 集成测试
测试API接口

```typescript
describe('POST /api/diet', () => {
  it('should return 201', async () => {
    const response = await request(app)
      .post('/api/diet')
      .send(data);
    expect(response.status).toBe(201);
  });
});
```

## 测试覆盖率

目标: 80%以上

```bash
npm run test:cov
```

## 测试命名

```
should_[expected behavior]_when_[condition]
```
