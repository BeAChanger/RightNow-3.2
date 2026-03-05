from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent

EMBEDDING_MODEL = os.getenv("RAG_EMBEDDING_MODEL", "all-MiniLM-L6-v2")
CHROMA_PERSIST_DIR = os.getenv("RAG_CHROMA_PERSIST_DIR", str(BASE_DIR / "chroma_db"))
CHUNK_SIZE = int(os.getenv("RAG_CHUNK_SIZE", "800"))
CHUNK_OVERLAP = int(os.getenv("RAG_CHUNK_OVERLAP", "100"))
PDF_BASE_PATH = os.getenv("RAG_PDF_BASE_PATH", "E:/fitness-knowledge-base")
USE_RERANKING = os.getenv("RAG_USE_RERANKING", "false").lower() == "true"
RERANKING_MODEL = os.getenv("RAG_RERANKING_MODEL", "cross-encoder/ms-marco-MiniLM-L-6-v2")
CORS_ORIGINS = os.getenv("RAG_CORS_ORIGINS", "http://localhost:5173")
