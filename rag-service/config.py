from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent

EMBEDDING_MODEL         = os.getenv("RAG_EMBEDDING_MODEL", "BAAI/bge-small-zh-v1.5")
EMBEDDING_QUERY_PREFIX  = os.getenv("RAG_QUERY_PREFIX", "为这个句子生成表示以用于检索相关文章：")
CHROMA_PERSIST_DIR      = os.getenv("RAG_CHROMA_PERSIST_DIR", str(BASE_DIR / "chroma_db"))
CHUNK_SIZE              = int(os.getenv("RAG_CHUNK_SIZE", "800"))
CHUNK_OVERLAP           = int(os.getenv("RAG_CHUNK_OVERLAP", "100"))
CLEANED_DATA_PATH       = os.getenv("RAG_CLEANED_DATA_PATH", "/data/cleaned-data")
USE_RERANKING           = os.getenv("RAG_USE_RERANKING", "false").lower() == "true"
RERANKING_MODEL         = os.getenv("RAG_RERANKING_MODEL", "cross-encoder/ms-marco-MiniLM-L-6-v2")
CORS_ORIGINS            = os.getenv("RAG_CORS_ORIGINS", "*")

# ── 三层检索架构 ──

# Layer 1: 专业知识库（生活化减脂实战经验）
PRACTICAL_DATA_PATH     = os.getenv("RAG_BLOGGER_DATA_PATH", "")
PRACTICAL_CHROMA_DIR    = os.getenv("RAG_BLOGGER_CHROMA_DIR", str(BASE_DIR / "chroma_blogger"))
USE_PRACTICAL           = os.getenv("RAG_USE_BLOGGER", "true").lower() == "true"

# Layer 2: 专业书库（现有，沿用 CLEANED_DATA_PATH / CHROMA_PERSIST_DIR）

# Layer 3: Web 搜索兜底
WEB_SEARCH_API_KEY      = os.getenv("RAG_WEB_SEARCH_API_KEY", "")
WEB_SEARCH_ENGINE       = os.getenv("RAG_WEB_SEARCH_ENGINE", "serpapi")  # serpapi | bing | duckduckgo
USE_WEB_SEARCH          = os.getenv("RAG_USE_WEB_SEARCH", "false").lower() == "true"

# 检索编排
SIMILARITY_THRESHOLD    = float(os.getenv("RAG_SIMILARITY_THRESHOLD", "0.40"))  # cosine distance: lower=better, ≤0.40 ≈ similarity≥0.60
LAYER1_MIN_RESULTS      = int(os.getenv("RAG_LAYER1_MIN_RESULTS", "1"))

# 中文分类目录 → 后端使用的 domain 标识
DOMAIN_MAP: dict[str, str] = {
    "运动学":       "kinesiology",
    "营养学":       "nutrition",
    "肌理学":       "kinesiology",
    "测试与评估":   "comprehensive",
    "训练与实操":   "comprehensive",
    "心理与康复":   "comprehensive",
    "生活化减脂内核": "comprehensive",
}
