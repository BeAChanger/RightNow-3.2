# Fitness RAG Service

独立的健身知识库 RAG 服务，为 RightNow Fitness AI 教练提供专业知识检索。

## 快速启动

```bash
# 安装依赖
pip install -r requirements.txt

# 首次导入知识库
python scripts/batch_import.py

# 启动服务
uvicorn main:app --host 0.0.0.0 --port 8000
```

## API 端点

- `POST /search` - 搜索知识
- `POST /import/file` - 上传单个文件
- `POST /import/rescan` - 重新扫描目录
- `DELETE /documents/by-source/{name}` - 删除文档
- `GET /documents/sources` - 列出所有文档
- `GET /health` - 健康检查

## 配置

编辑 `config.py` 修改：
- `PDF_BASE_PATH` - 知识库路径
- `USE_RERANKING` - 启用重排序优化（默认关闭）
