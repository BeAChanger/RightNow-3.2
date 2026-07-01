"""
L1 FAQ 灌入服务
从 faq.json 直接写入 ChromaDB kb_l1_faq collection。
每个 FAQ 条目 = 一个 chunk，question 字段做向量嵌入，answer 等存 metadata。
"""
import json
from pathlib import Path
from langchain_chroma import Chroma
from langchain_core.documents import Document


class FaqIngestService:
    """FAQ 结构化灌入：JSON → ChromaDB。

    不经过文档切分器 —— 每个条目已经是精炼好的问答对。
    向量嵌入文本 = question（与用户 query 语义空间接近）；
    metadata 包含 answer / tags / goal 等字段。
    """

    def __init__(self, vectorstore: Chroma):
        self.vectorstore = vectorstore

    def ingest_json(self, faq_path: str, force: bool = False) -> dict:
        """从 faq.json 灌入全部条目。

        返回 {"chunks": int, "goals": dict}
        """
        path = Path(faq_path)
        if not path.exists():
            return {"chunks": 0, "error": f"FAQ file not found: {faq_path}"}

        with open(path, encoding="utf-8") as f:
            faqs = json.load(f)

        if force:
            col = self.vectorstore._collection
            try:
                existing = col.get()["ids"]
                if existing:
                    col.delete(ids=existing)
            except Exception:
                pass

        docs = []
        for item in faqs:
            meta = {
                "answer": item.get("answer", ""),
                "tags": ",".join(item.get("tags", [])),
                "goal": item.get("goal", ""),
                "source_doc": item.get("source_doc", ""),
                "source_section": item.get("source_section", ""),
                "type": "faq",
                "priority": "high",
            }
            docs.append(
                Document(
                    page_content=item.get("question", ""),
                    metadata=meta,
                    id=item.get("id", ""),
                )
            )

        self.vectorstore.add_documents(docs)

        goals = {}
        for item in faqs:
            g = item.get("goal", "未知")
            goals[g] = goals.get(g, 0) + 1

        return {"chunks": len(docs), "goals": goals}

    def ingest_from_api(self, faqs: list[dict], force: bool = False) -> dict:
        """通过 API 传入的 FAQ 列表直接灌入（配合 POST /import/faq-l1）。"""
        if force:
            col = self.vectorstore._collection
            try:
                existing = col.get()["ids"]
                if existing:
                    col.delete(ids=existing)
            except Exception:
                pass

        docs = []
        for item in faqs:
            meta = {
                "answer": item.get("answer", ""),
                "tags": ",".join(item.get("tags", [])),
                "goal": item.get("goal", ""),
                "source_doc": item.get("source_doc", ""),
                "source_section": item.get("source_section", ""),
                "type": "faq",
                "priority": "high",
            }
            docs.append(
                Document(
                    page_content=item.get("question", ""),
                    metadata=meta,
                    id=item.get("id", ""),
                )
            )

        self.vectorstore.add_documents(docs)

        goals = {}
        for item in faqs:
            g = item.get("goal", "未知")
            goals[g] = goals.get(g, 0) + 1

        return {"chunks": len(docs), "goals": goals}
