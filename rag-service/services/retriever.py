"""
LangChain Chroma 检索服务
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


def build_vectorstore(
    embeddings: HuggingFaceEmbeddings,
    collection_name: str = "fitness_knowledge",
    persist_dir: str = None,
    **kwargs,
) -> Chroma:
    """创建或加载 Chroma vectorstore。

    显式指定 HNSW 参数，避免 chromadb 1.0.x 在 query + where 过滤时出现
    "Error executing plan: Internal error: Error finding id" 的问题。
    """
    hnsw_metadata = {
        "hnsw:space": "cosine",
        "hnsw:construction_ef": 128,
        "hnsw:search_ef": 128,
    }
    return Chroma(
        collection_name=collection_name,
        embedding_function=embeddings,
        persist_directory=persist_dir or config.CHROMA_PERSIST_DIR,
        collection_metadata=hnsw_metadata,
        **kwargs,
    )


def build_practical_vectorstore(embeddings: HuggingFaceEmbeddings) -> Chroma | None:
    """创建专业知识库 vectorstore（独立 collection）。"""
    if not config.USE_PRACTICAL or not config.PRACTICAL_DATA_PATH:
        return None
    return build_vectorstore(
        embeddings,
        collection_name="blogger_knowledge",
        persist_dir=config.PRACTICAL_CHROMA_DIR,
    )


class RetrieverService:
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
        """带相似度分数的检索。"""
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
