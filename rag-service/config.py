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

# ── 四层检索架构（v2: 并行+L1短路，替代旧三层顺序兜底）───────────────

# Layer 1: FAQ 快路（三文档结构化问答对）
L1_COLLECTION           = os.getenv("RAG_L1_COLLECTION", "kb_l1_faq")
L1_CHROMA_DIR           = os.getenv("RAG_L1_CHROMA_DIR", str(BASE_DIR / "chroma_l1_faq"))
L1_FAQ_PATH             = os.getenv("RAG_L1_FAQ_PATH", "")  # faq.json 路径
L1_FAST_THRESHOLD       = float(os.getenv("RAG_L1_FAST_THRESHOLD", "0.30"))
L1_MIN_RESULTS          = int(os.getenv("RAG_L1_MIN_RESULTS", "1"))
L1_WAIT_MS              = int(os.getenv("RAG_L1_WAIT_MS", "150"))
L1_SEARCH_EF            = int(os.getenv("RAG_L1_SEARCH_EF", "16"))
USE_L1_FAQ              = os.getenv("RAG_USE_L1_FAQ", "true").lower() == "true"

# Layer 2: 生活化减脂内核其它部分（1-4 节）
L2_COLLECTION           = os.getenv("RAG_L2_COLLECTION", "kb_l2_core")
L2_CHROMA_DIR           = os.getenv("RAG_L2_CHROMA_DIR", str(BASE_DIR / "chroma_l2_core"))
L2_DATA_PATH            = os.getenv("RAG_L2_DATA_PATH", "")  # 内核 1-4 节目录
USE_L2_CORE             = os.getenv("RAG_USE_L2_CORE", "true").lower() == "true"

# Layer 3: 营养学书籍
L3_COLLECTION           = os.getenv("RAG_L3_COLLECTION", "kb_l3_books")
L3_CHROMA_DIR           = os.getenv("RAG_L3_CHROMA_DIR", str(BASE_DIR / "chroma_l3_books"))
L3_DATA_PATH            = os.getenv("RAG_L3_DATA_PATH", "")  # 营养学书籍目录
USE_L3_BOOKS            = os.getenv("RAG_USE_L3_BOOKS", "true").lower() == "true"

# Layer 4: Web 搜索兜底（旧 L3）
WEB_SEARCH_API_KEY      = os.getenv("RAG_WEB_SEARCH_API_KEY", "")
WEB_SEARCH_ENGINE       = os.getenv("RAG_WEB_SEARCH_ENGINE", "serpapi")
USE_WEB_SEARCH          = os.getenv("RAG_USE_WEB_SEARCH", "false").lower() == "true"

# 快路全局开关
FAST_PATH               = os.getenv("RAG_FAST_PATH", "true").lower() == "true"

# 兼容旧三层（过渡期，默认关闭以走新架构）
USE_LEGACY              = os.getenv("RAG_USE_LEGACY", "false").lower() == "true"
SIMILARITY_THRESHOLD    = float(os.getenv("RAG_SIMILARITY_THRESHOLD", "0.40"))
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

# ── 兼容旧架构字段（过渡期，仅 USE_LEGACY=true 时引用）──
PRACTICAL_DATA_PATH     = os.getenv("RAG_BLOGGER_DATA_PATH", "")
PRACTICAL_CHROMA_DIR    = os.getenv("RAG_BLOGGER_CHROMA_DIR", str(BASE_DIR / "chroma_blogger"))
USE_PRACTICAL           = os.getenv("RAG_USE_BLOGGER", "true").lower() == "true"
