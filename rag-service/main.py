from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_core.documents import Document
import tempfile, os
from pathlib import Path

import config
from services.retriever import (
    build_embeddings, build_vectorstore, build_practical_vectorstore, RetrieverService,
)
from services.ingest import IngestService, PracticalIngestService
from services.multi_layer import MultiLayerRetriever
from services.web_search import WebSearchClient


app = FastAPI(title="RightNow RAG Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 启动初始化 ──

print(f"[Startup] Loading embedding model: {config.EMBEDDING_MODEL}")
_embeddings = build_embeddings()

# Layer 2: 专业书库
_vectorstore_l2 = build_vectorstore(_embeddings)
_retriever_l2 = RetrieverService(_vectorstore_l2)
_ingestor_l2 = IngestService(_vectorstore_l2)
print(f"[Startup] Layer 2 ready: {_retriever_l2.count()} chunks")

# Layer 1: 专业知识库
_vectorstore_l1 = None
_retriever_l1 = None
_ingestor_l1 = None
l1_count = 0
if config.USE_PRACTICAL and config.PRACTICAL_DATA_PATH:
    try:
        _vectorstore_l1 = build_practical_vectorstore(_embeddings)
        _retriever_l1 = RetrieverService(_vectorstore_l1)
        _ingestor_l1 = PracticalIngestService(_vectorstore_l1)
        l1_count = _retriever_l1.count()
        print(f"[Startup] Layer 1 ready: {l1_count} chunks")
    except Exception as exc:
        print(f"[Startup] Layer 1 init failed: {exc}")
        _vectorstore_l1 = None

# Layer 3: Web 搜索
_web_client = None
if config.USE_WEB_SEARCH and config.WEB_SEARCH_API_KEY:
    _web_client = WebSearchClient()
    print(f"[Startup] Layer 3 ready (engine={config.WEB_SEARCH_ENGINE})")
elif config.USE_WEB_SEARCH:
    # DuckDuckGo 不需要 API Key
    _web_client = WebSearchClient()
    print(f"[Startup] Layer 3 ready (engine=duckduckgo, no API key needed)")

# 统一检索器
multi_retriever = MultiLayerRetriever(
    layer1_vs=_vectorstore_l1,
    layer1_retriever=_retriever_l1,
    layer2_retriever=_retriever_l2,
    web_client=_web_client,
)


# ── 请求模型 ──

class SearchRequest(BaseModel):
    query: str
    top_k: int = 5
    domain: str = None


class DocumentRequest(BaseModel):
    content: str
    metadata: dict = {}


# ── 路由 ──

@app.post("/search")
async def search_knowledge(request: SearchRequest):
    """三层检索入口。"""
    return multi_retriever.search(request.query, request.top_k, request.domain)


@app.post("/documents")
async def add_document(request: DocumentRequest):
    doc = Document(page_content=request.content, metadata=request.metadata)
    _vectorstore_l2.add_documents([doc])
    return {"status": "success"}


@app.post("/import/file")
async def import_file(file: UploadFile = File(...), domain: str = "general"):
    suffix = Path(file.filename).suffix
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    try:
        n = _ingestor_l2.ingest_file(tmp_path, {"source": file.filename, "domain": domain, "type": "upload"})
    finally:
        os.unlink(tmp_path)
    return {"status": "success", "chunks_added": n, "source": file.filename}


@app.delete("/documents/by-source/{source_name}")
async def delete_by_source(source_name: str):
    n = _retriever_l2.delete_by_source(source_name)
    return {"status": "success", "chunks_deleted": n}


@app.get("/documents/sources")
async def list_sources():
    return {"sources": _retriever_l2.list_sources()}


@app.post("/import/rescan-layer1")
async def rescan_blogger(force: bool = False):
    """重新入库 Layer 1（专业知识库）。"""
    if _vectorstore_l1 is None:
        return {"status": "error", "message": "Layer 1 not configured"}
    if force:
        _vectorstore_l1._collection.delete(where={})
    result = _ingestor_l1.ingest_directory(config.PRACTICAL_DATA_PATH)
    return {"status": "success", "chunks_added": result["chunks"], "layer": 1}


@app.post("/import/rescan")
async def rescan_directory(force: bool = False):
    """重新入库 Layer 2（专业书库）。"""
    if force:
        _vectorstore_l2._collection.delete(where={})
    result = _ingestor_l2.ingest_directory(config.CLEANED_DATA_PATH)
    return {"status": "success", "chunks_added": result["chunks"], "layer": 2}


@app.post("/import/rescan-all")
async def rescan_all_layers(force: bool = False):
    """重新入库全部层。"""
    l1, l2 = 0, 0

    if _vectorstore_l1 and config.PRACTICAL_DATA_PATH:
        if force:
            _vectorstore_l1._collection.delete(where={})
        l1 = _ingestor_l1.ingest_directory(config.PRACTICAL_DATA_PATH)["chunks"]

    if force:
        _vectorstore_l2._collection.delete(where={})
    l2 = _ingestor_l2.ingest_directory(config.CLEANED_DATA_PATH)["chunks"]

    return {"status": "success", "layer1_chunks": l1, "layer2_chunks": l2}


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "embedding_model": config.EMBEDDING_MODEL,
        "architecture": "three-layer",
        "layer1": {
            "enabled": config.USE_PRACTICAL,
            "collection": "practical_knowledge",
            "vector_count": multi_retriever.count_layer1(),
            "data_path": config.PRACTICAL_DATA_PATH,
        },
        "layer2": {
            "collection": "fitness_knowledge",
            "vector_count": multi_retriever.count_layer2(),
            "chunk_size": config.CHUNK_SIZE,
        },
        "layer3": {
            "enabled": config.USE_WEB_SEARCH,
            "engine": config.WEB_SEARCH_ENGINE,
        },
        "reranking": config.USE_RERANKING,
    }
