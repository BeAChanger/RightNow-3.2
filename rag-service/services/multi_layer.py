"""
多层检索编排器

Layer 1 (专业知识库) → Layer 2 (专业书库) → Layer 3 (Web 搜索)
每层带相似度阈值和结果数评估，自动 fallback。
"""
from langchain_core.documents import Document
import config


class MultiLayerRetriever:
    def __init__(
        self,
        layer1_vs,          # Chroma vectorstore — 专业知识库
        layer1_retriever,   # RetrieverService — 专业知识检索
        layer2_retriever,   # RetrieverService — 专业书检索
        web_client=None,    # WebSearchClient | None
    ):
        self.layer1_vs = layer1_vs
        self.layer1 = layer1_retriever
        self.layer2 = layer2_retriever
        self.web_client = web_client

    def search(self, query: str, top_k: int = 5, domain: str = None) -> dict:
        """执行三层检索，返回格式化结果。"""
        combined = []
        l1_used = False  # 跟踪 Layer 1 是否有结果被采用

        # ──── Layer 1: 专业知识库 ────
        if self.layer1 and self.layer1_vs is not None:
            try:
                # L1 检索更多候选，确保低分区域也有足够结果过阈值
                l1_candidates = self.layer1.search_with_score(query, top_k=top_k * 2)
                print(f"[MultiLayer] L1 raw candidates: {len(l1_candidates)}")
                if l1_candidates:
                    print(f"[MultiLayer] L1 top score: {l1_candidates[0][1]:.4f}")
            except Exception as exc:
                print(f"[MultiLayer] Layer 1 search error: {exc}")
                import traceback; traceback.print_exc()
                l1_candidates = []

            good = [(d, s) for d, s in l1_candidates if s <= config.SIMILARITY_THRESHOLD]  # cosine distance: lower = more similar
            print(f"[MultiLayer] L1 good (distance<={config.SIMILARITY_THRESHOLD}): {len(good)}")
            if len(good) > 0:
                combined.extend([d for d, _ in good])
                l1_used = True
                print(f"[MultiLayer] L1 combined now: {len(combined)}, top_k={top_k}")
                # L1 有命中时，如果已经够 top_k 就直接返回
                if len(combined) >= top_k:
                    print(f"[MultiLayer] L1 enough, returning layer=1")
                    return self._format(combined[:top_k], layer=1)
        else:
            print(f"[MultiLayer] L1 skipped: layer1={self.layer1 is not None}, vs={self.layer1_vs is not None}")

        # ──── Layer 2: 专业书库 ────
        try:
            l2_docs = self.layer2.search(query, top_k=top_k, domain=domain)
        except Exception as exc:
            print(f"[MultiLayer] Layer 2 search error: {exc}")
            l2_docs = []

        # L2 去重：避免与已加入的 L1 结果重复
        seen_texts = {d.page_content[:120] for d in combined}
        for doc in l2_docs:
            if doc.page_content[:120] not in seen_texts:
                combined.append(doc)
                seen_texts.add(doc.page_content[:120])

        # 判断最终来源层
        source_layer = 1 if l1_used else 2

        if len(combined) >= top_k:
            return self._format(combined[:top_k], layer=source_layer)

        # ──── Layer 3: Web 搜索 ────
        if self.web_client and config.USE_WEB_SEARCH:
            try:
                web_docs = self.web_client.search(query, top_k=top_k)
                combined.extend(web_docs)
                return self._format(combined[:top_k], layer=3 if not l1_used else source_layer)
            except Exception as exc:
                print(f"[MultiLayer] Layer 3 web search error: {exc}")

        # 无论怎样，返回手里有的
        return self._format(combined[:top_k] if combined else [], layer=source_layer)

    def _format(self, docs: list[Document], layer: int) -> dict:
        return {
            "results": {
                "documents": [[d.page_content for d in docs]],
                "metadatas": [[d.metadata for d in docs]],
            },
            "source_layer": layer,
        }

    def count_layer1(self) -> int:
        if self.layer1_vs is None:
            return 0
        try:
            return self.layer1_vs._collection.count()
        except Exception:
            return 0

    def count_layer2(self) -> int:
        return self.layer2.count()
