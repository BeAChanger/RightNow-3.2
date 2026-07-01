from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_core.documents import Document
import tempfile, os, json
from pathlib import Path

import config
from services.retriever import (
    build_embeddings, build_vectorstore,
    build_l1_vectorstore, build_l2_vectorstore, build_l3_vectorstore,
    RetrieverService,
)
from services.ingest import IngestService
from services.faq_ingest import FaqIngestService
from services.fast_multi_layer import FastMultiLayerRetriever
from services.web_search import WebSearchClient


app = FastAPI(title="RightNow RAG Service v2")
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ═══════════════════════════════════════════════════════════════════════
# 启动初始化
# ═══════════════════════════════════════════════════════════════════════

print(f"[Startup] Loading embedding model: {config.EMBEDDING_MODEL}")
_embeddings = build_embeddings()

# ── L1: FAQ 快路 ──
_vectorstore_l1 = None
_retriever_l1 = None
_faq_ingestor = None
if config.USE_L1_FAQ:
    try:
        _vectorstore_l1 = build_l1_vectorstore(_embeddings)
        _retriever_l1 = RetrieverService(_vectorstore_l1)
        _faq_ingestor = FaqIngestService(_vectorstore_l1)
        l1_cnt = _vectorstore_l1._collection.count()
        print(f"[Startup] L1 FAQ ready: collection='{config.L1_COLLECTION}', chunks={l1_cnt}, "
              f"search_ef={config.L1_SEARCH_EF}, threshold={config.L1_FAST_THRESHOLD}")
    except Exception as exc:
        print(f"[Startup] L1 FAQ init failed: {exc}")
        _vectorstore_l1 = None
        _retriever_l1 = None
else:
    print("[Startup] L1 FAQ disabled (RAG_USE_L1_FAQ=false)")

# ── L2: 内核其它 ──
_vectorstore_l2 = None
_retriever_l2 = None
_ingestor_l2 = None
if config.USE_L2_CORE and config.L2_DATA_PATH:
    try:
        _vectorstore_l2 = build_l2_vectorstore(_embeddings)
        _retriever_l2 = RetrieverService(_vectorstore_l2)
        _ingestor_l2 = IngestService(_vectorstore_l2)
        l2_cnt = _vectorstore_l2._collection.count()
        print(f"[Startup] L2 core ready: collection='{config.L2_COLLECTION}', chunks={l2_cnt}")
    except Exception as exc:
        print(f"[Startup] L2 core init failed: {exc}")
        _vectorstore_l2 = None
        _retriever_l2 = None
else:
    print("[Startup] L2 core disabled (set RAG_USE_L2_CORE=true RAG_L2_DATA_PATH=...)")

# ── L3: 书籍 ──
_vectorstore_l3 = None
_retriever_l3 = None
_ingestor_l3 = None
if config.USE_L3_BOOKS and config.L3_DATA_PATH:
    try:
        _vectorstore_l3 = build_l3_vectorstore(_embeddings)
        _retriever_l3 = RetrieverService(_vectorstore_l3)
        _ingestor_l3 = IngestService(_vectorstore_l3)
        l3_cnt = _vectorstore_l3._collection.count()
        print(f"[Startup] L3 books ready: collection='{config.L3_COLLECTION}', chunks={l3_cnt}")
    except Exception as exc:
        print(f"[Startup] L3 books init failed: {exc}")
        _vectorstore_l3 = None
        _retriever_l3 = None
else:
    print("[Startup] L3 books disabled (set RAG_USE_L3_BOOKS=true RAG_L3_DATA_PATH=...)")

# ── Web 搜索 ──
_web_client = None
if config.USE_WEB_SEARCH and (config.WEB_SEARCH_API_KEY or config.WEB_SEARCH_ENGINE == "duckduckgo"):
    _web_client = WebSearchClient()
    print(f"[Startup] Web search ready (engine={config.WEB_SEARCH_ENGINE})")
else:
    print(f"[Startup] Web search disabled")

# ── 统一检索器 ──
fast_retriever = FastMultiLayerRetriever(
    l1_retriever=_retriever_l1,
    l2_retriever=_retriever_l2,
    l3_retriever=_retriever_l3,
    web_client=_web_client,
)

# ── 兼容旧架构（仅当 USE_LEGACY=true） ──
_legacy_retriever = None
if config.USE_LEGACY:
    from services.multi_layer import MultiLayerRetriever
    from services.retriever import build_practical_vectorstore
    _v2 = build_vectorstore(_embeddings, collection_name="fitness_knowledge")
    _r2 = RetrieverService(_v2)
    _v1 = build_practical_vectorstore(_embeddings) if hasattr(config, 'PRACTICAL_DATA_PATH') and config.PRACTICAL_DATA_PATH else None
    _r1 = RetrieverService(_v1) if _v1 else None
    _legacy_retriever = MultiLayerRetriever(
        layer1_vs=_v1, layer1_retriever=_r1,
        layer2_retriever=_r2, web_client=_web_client,
    )
    print("[Startup] Legacy multi-layer fallback ready")


# ── 工具函数 ──


def _safe_clear_col(vs):
    """安全清空 ChromaDB collection（chromadb 1.0.x 兼容）。"""
    try:
        ids = vs._collection.get()["ids"]
        if ids:
            vs._collection.delete(ids=ids)
    except Exception as exc:
        print(f"[SafeClear] Warning: {exc}")


# ═══════════════════════════════════════════════════════════════════════
# 请求模型
# ═══════════════════════════════════════════════════════════════════════

class SearchRequest(BaseModel):
    query: str
    top_k: int = 5
    domain: str = None
    fast_path: bool = True  # 默认走新快路


class DocumentRequest(BaseModel):
    content: str
    metadata: dict = {}


class FaqImportRequest(BaseModel):
    faqs: list[dict] = []
    force: bool = False


# ═══════════════════════════════════════════════════════════════════════
# 路由 — 检索
# ═══════════════════════════════════════════════════════════════════════

@app.post("/search")
async def search_knowledge(request: SearchRequest):
    """统一检索入口 v2。
    默认走 FastMultiLayerRetriever（并行+L1短路）；
    fast_path=false 时回退旧顺序逻辑（需 USE_LEGACY=true）。
    """
    if not request.fast_path and _legacy_retriever:
        return _legacy_retriever.search(request.query, request.top_k, request.domain)
    return fast_retriever.search(
        request.query, request.top_k, request.domain,
        fast_path=request.fast_path,
    )


# ═══════════════════════════════════════════════════════════════════════
# 路由 — L1 FAQ 灌入（新）
# ═══════════════════════════════════════════════════════════════════════

@app.post("/import/faq-l1")
async def import_faq_l1(request: FaqImportRequest):
    """灌入 L1 FAQ 数据到 kb_l1_faq collection。"""
    if not _faq_ingestor:
        return {"status": "error", "message": "L1 FAQ not configured (set RAG_USE_L1_FAQ=true)"}

    if request.faqs:
        # 从 API body 直接灌入
        result = _faq_ingestor.ingest_from_api(request.faqs, force=request.force)
    elif config.L1_FAQ_PATH:
        # 从本地 faq.json 文件灌入
        result = _faq_ingestor.ingest_json(config.L1_FAQ_PATH, force=request.force)
    else:
        return {"status": "error", "message": "No faqs in request and RAG_L1_FAQ_PATH not set"}

    return {"status": "success", **result, "layer": 1, "collection": config.L1_COLLECTION}


# ═══════════════════════════════════════════════════════════════════════
# 路由 — 三层独立重建
# ═══════════════════════════════════════════════════════════════════════

@app.post("/import/rescan-l1")
async def rescan_l1(force: bool = False):
    """重建 L1 FAQ（从 RAG_L1_FAQ_PATH 的 faq.json）。"""
    if not _faq_ingestor or not config.L1_FAQ_PATH:
        return {"status": "error", "message": "L1 FAQ not configured"}
    result = _faq_ingestor.ingest_json(config.L1_FAQ_PATH, force=force)
    return {"status": "success", **result, "layer": 1, "collection": config.L1_COLLECTION}


@app.post("/import/rescan-l2")
async def rescan_l2(force: bool = False):
    """重建 L2 内核其它（从 RAG_L2_DATA_PATH）。"""
    if not _ingestor_l2 or not config.L2_DATA_PATH:
        return {"status": "error", "message": "L2 core not configured"}
    if force:
        _safe_clear_col(_vectorstore_l2)
    result = _ingestor_l2.ingest_directory(config.L2_DATA_PATH)
    return {"status": "success", **result, "layer": 2, "collection": config.L2_COLLECTION}


@app.post("/import/rescan-l3")
async def rescan_l3(force: bool = False):
    """重建 L3 书籍（从 RAG_L3_DATA_PATH）。"""
    if not _ingestor_l3 or not config.L3_DATA_PATH:
        return {"status": "error", "message": "L3 books not configured"}
    if force:
        _safe_clear_col(_vectorstore_l3)
    result = _ingestor_l3.ingest_flat(config.L3_DATA_PATH, domain="nutrition")
    return {"status": "success", **result, "layer": 3, "collection": config.L3_COLLECTION}


@app.post("/import/rescan-all")
async def rescan_all_layers(force: bool = False):
    """重建全部三层。"""
    results: dict[str, dict] = {}

    if _faq_ingestor and config.L1_FAQ_PATH:
        results["l1"] = _faq_ingestor.ingest_json(config.L1_FAQ_PATH, force=force)

    if _ingestor_l2 and config.L2_DATA_PATH:
        if force:
            _safe_clear_col(_vectorstore_l2)
        results["l2"] = _ingestor_l2.ingest_directory(config.L2_DATA_PATH)

    if _ingestor_l3 and config.L3_DATA_PATH:
        if force:
            _safe_clear_col(_vectorstore_l3)
        results["l3"] = _ingestor_l3.ingest_flat(config.L3_DATA_PATH, domain="nutrition")

    return {"status": "success", "results": results}


# ═══════════════════════════════════════════════════════════════════════
# 路由 — 兼容旧接口
# ═══════════════════════════════════════════════════════════════════════

@app.post("/documents")
async def add_document(request: DocumentRequest):
    """添加单篇文档到 L2。"""
    if not _vectorstore_l2:
        return {"status": "error", "message": "L2 not available"}
    doc = Document(page_content=request.content, metadata=request.metadata)
    _vectorstore_l2.add_documents([doc])
    return {"status": "success"}


@app.post("/import/file")
async def import_file(file: UploadFile = File(...), domain: str = "general"):
    if not _ingestor_l2:
        return {"status": "error", "message": "L2 not available"}
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
    if not _retriever_l2:
        return {"status": "error", "message": "L2 not available"}
    n = _retriever_l2.delete_by_source(source_name)
    return {"status": "success", "chunks_deleted": n}


@app.get("/documents/sources")
async def list_sources():
    if not _retriever_l2:
        return {"sources": []}
    return {"sources": _retriever_l2.list_sources()}


@app.get("/health")
async def health_check():
    """健康检查 v2 — 暴露四层架构状态。"""
    h = {
        "status": "healthy",
        "embedding_model": config.EMBEDDING_MODEL,
        "architecture": "four-layer-fast",
        "fast_path": config.FAST_PATH,
    }

    h["layer1"] = {
        "name": "FAQ 快路",
        "collection": config.L1_COLLECTION,
        "enabled": config.USE_L1_FAQ,
        "vector_count": fast_retriever.count_l1(),
        "threshold": config.L1_FAST_THRESHOLD,
        "search_ef": config.L1_SEARCH_EF,
    }

    h["layer2"] = {
        "name": "内核其它",
        "collection": config.L2_COLLECTION,
        "enabled": bool(_retriever_l2),
        "vector_count": fast_retriever.count_l2(),
        "chunk_size": config.CHUNK_SIZE,
    }

    h["layer3"] = {
        "name": "书籍",
        "collection": config.L3_COLLECTION,
        "enabled": bool(_retriever_l3),
        "vector_count": fast_retriever.count_l3(),
        "chunk_size": config.CHUNK_SIZE,
    }

    h["layer4"] = {
        "name": "Web 搜索",
        "enabled": config.USE_WEB_SEARCH,
        "engine": config.WEB_SEARCH_ENGINE,
    }

    h["reranking"] = config.USE_RERANKING
    return h


# ── 启动摘要 ──
print("\n" + "=" * 60)
print(f"  RAG Service v2 ready")
print(f"  L1 FAQ:    {'enabled' if _retriever_l1 else 'disabled'}  "
      f"({fast_retriever.count_l1()} chunks, ef={config.L1_SEARCH_EF}, thr={config.L1_FAST_THRESHOLD})")
print(f"  L2 Core:   {'enabled' if _retriever_l2 else 'disabled'}  "
      f"({fast_retriever.count_l2()} chunks)")
print(f"  L3 Books:  {'enabled' if _retriever_l3 else 'disabled'}  "
      f"({fast_retriever.count_l3()} chunks)")
print(f"  Web:       {'enabled' if _web_client else 'disabled'}")
print(f"  Fast Path: {'ON' if config.FAST_PATH else 'OFF (legacy sequential)'}")
print("=" * 60 + "\n")
