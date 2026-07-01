"""
LangChain Chroma 检索服务（v2）
支持四层 collection：kb_l1_faq / kb_l2_core / kb_l3_books / web
"""
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
import config


def build_embeddings() -> HuggingFaceEmbeddings:
    return HuggingFaceEmbeddings(
        model_name=config.EMBEDDING_MODEL,
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )


def _make_hnsw_meta(search_ef: int = 128, construction_ef: int = 128) -> dict:
    """HNSW 参数工厂。L1 极微索引用低 ef 加速。"""
    return {
        "hnsw:space": "cosine",
        "hnsw:construction_ef": construction_ef,
        "hnsw:search_ef": search_ef,
    }


def build_vectorstore(
    embeddings: HuggingFaceEmbeddings,
    collection_name: str = "fitness_knowledge",
    persist_dir: str = None,
    search_ef: int = 128,
    construction_ef: int = 128,
    **kwargs,
) -> Chroma:
    """通用 vectorstore 工厂。"""
    return Chroma(
        collection_name=collection_name,
        embedding_function=embeddings,
        persist_directory=persist_dir or config.CHROMA_PERSIST_DIR,
        collection_metadata=_make_hnsw_meta(search_ef, construction_ef),
        **kwargs,
    )


def build_l1_vectorstore(embeddings: HuggingFaceEmbeddings) -> Chroma | None:
    """L1 FAQ 快路 vectorstore。极微索引，search_ef=16。"""
    if not config.USE_L1_FAQ:
        return None
    return build_vectorstore(
        embeddings,
        collection_name=config.L1_COLLECTION,
        persist_dir=config.L1_CHROMA_DIR,
        search_ef=config.L1_SEARCH_EF,
    )


def build_l2_vectorstore(embeddings: HuggingFaceEmbeddings) -> Chroma | None:
    """L2 内核其它 vectorstore。"""
    if not config.USE_L2_CORE or not config.L2_DATA_PATH:
        return None
    return build_vectorstore(
        embeddings,
        collection_name=config.L2_COLLECTION,
        persist_dir=config.L2_CHROMA_DIR,
    )


def build_l3_vectorstore(embeddings: HuggingFaceEmbeddings) -> Chroma | None:
    """L3 书籍 vectorstore。"""
    if not config.USE_L3_BOOKS or not config.L3_DATA_PATH:
        return None
    return build_vectorstore(
        embeddings,
        collection_name=config.L3_COLLECTION,
        persist_dir=config.L3_CHROMA_DIR,
    )


# ── 兼容旧版 API ──

def build_practical_vectorstore(embeddings: HuggingFaceEmbeddings) -> Chroma | None:
    """旧 Layer 1 builder（兼容过渡期，仅 USE_LEGACY 时调用）。"""
    import os
    legacy_dir = os.getenv("RAG_BLOGGER_CHROMA_DIR", str(config.BASE_DIR / "chroma_blogger"))
    return build_vectorstore(
        embeddings,
        collection_name="blogger_knowledge",
        persist_dir=legacy_dir,
    )


# ── 检索服务 ──

class RetrieverService:
    """单层向量检索服务（支持可选的 cross-encoder rerank）。"""

    def __init__(self, vectorstore: Chroma):
        self.vectorstore = vectorstore
        self._reranker = None
        if config.USE_RERANKING:
            from langchain_community.cross_encoders import HuggingFaceCrossEncoder
            from langchain.retrievers.document_compressors import CrossEncoderReranker
            self._reranker = CrossEncoderReranker(
                model=HuggingFaceCrossEncoder(model_name=config.RERANKING_MODEL),
                top_n=10,
            )

    def search(self, query: str, top_k: int = 5, domain: str = None):
        k = top_k * 3 if self._reranker else top_k
        search_kwargs = {"k": k}
        if domain and domain != "comprehensive":
            search_kwargs["filter"] = {"domain": domain}

        retriever = self.vectorstore.as_retriever(search_kwargs=search_kwargs)

        if self._reranker:
            from langchain.retrievers import ContextualCompressionRetriever
            retriever = ContextualCompressionRetriever(
                base_compressor=self._reranker,
                base_retriever=retriever,
            )

        return retriever.invoke(query)[:top_k]

    def search_with_score(self, query: str, top_k: int = 5, domain: str = None):
        """带 cosine distance 分数的检索。"""
        k = top_k * 3 if self._reranker else top_k
        filter_kwargs = {}
        if domain and domain != "comprehensive":
            filter_kwargs["filter"] = {"domain": domain}

        results = self.vectorstore.similarity_search_with_score(
            query, k=k, **filter_kwargs
        )
        return results[:top_k]

    def delete_by_source(self, source_name: str) -> int:
        col = self.vectorstore._collection
        ids = col.get(where={"source": source_name})["ids"]
        if ids:
            col.delete(ids=ids)
        return len(ids)

    def list_sources(self) -> list:
        metas = self.vectorstore._collection.get(include=["metadatas"])["metadatas"]
        counts: dict[str, int] = {}
        for m in metas:
            s = m.get("source", "unknown")
            counts[s] = counts.get(s, 0) + 1
        return [{"source": s, "chunks": c} for s, c in counts.items()]

    def count(self) -> int:
        return self.vectorstore._collection.count()
