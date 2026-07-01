from pathlib import Path

from langchain_community.document_loaders import TextLoader
from langchain_chroma import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter, MarkdownHeaderTextSplitter

import config


class IngestService:
    """专业书库入库服务。"""

    def __init__(self, vectorstore: Chroma):
        self.vectorstore = vectorstore
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=config.CHUNK_SIZE,
            chunk_overlap=config.CHUNK_OVERLAP,
        )

    def ingest_file(self, path: str, metadata: dict = None) -> int:
        loader = TextLoader(path, encoding="utf-8", autodetect_encoding=True)
        docs = self.splitter.split_documents(loader.load())
        if metadata:
            for doc in docs:
                doc.metadata.update(metadata)
        self.vectorstore.add_documents(docs)
        return len(docs)

    def ingest_flat(self, data_dir: str, domain: str = "comprehensive") -> dict:
        """灌入平铺的 .md 文件（无子目录结构，如 L3 书籍）。"""
        data_path = Path(data_dir)
        total = 0
        files = list(data_path.rglob("*.md"))
        for md_file in files:
            try:
                loader = TextLoader(str(md_file), encoding="utf-8", autodetect_encoding=True)
                docs = self.splitter.split_documents(loader.load())
                for doc in docs:
                    doc.metadata.update({
                        "source": md_file.name,
                        "domain": domain,
                        "category": data_path.name,
                        "type": "markdown",
                    })
                self.vectorstore.add_documents(docs)
                total += len(docs)
            except Exception as exc:
                print(f"Failed to ingest {md_file.name}: {exc}")
        return {"chunks": total}

    def ingest_directory(self, data_dir: str) -> dict:
        data_path = Path(data_dir)
        total = 0
        for category_dir in sorted(data_path.iterdir()):
            if not category_dir.is_dir():
                continue

            domain = config.DOMAIN_MAP.get(category_dir.name, "comprehensive")
            files = list(category_dir.rglob("*.md"))
            for md_file in files:
                try:
                    loader = TextLoader(str(md_file), encoding="utf-8", autodetect_encoding=True)
                    docs = self.splitter.split_documents(loader.load())
                    for doc in docs:
                        doc.metadata.update(
                            {
                                "source": md_file.name,
                                "domain": domain,
                                "category": category_dir.name,
                                "type": "markdown",
                            }
                        )
                    self.vectorstore.add_documents(docs)
                    total += len(docs)
                except Exception as exc:
                    print(f"Failed to ingest {md_file.name}: {exc}")
            print(f"Ingested {category_dir.name}: {len(files)} files")
        return {"chunks": total}


class PracticalIngestService:
    """专业知识库入库服务。

    使用 MarkdownHeaderTextSplitter 按 ##/### 标题切分，
    保持问答对或小节的语义完整性，避免 Q&A 被切断。
    """

    def __init__(self, vectorstore: Chroma):
        self.vectorstore = vectorstore
        self.header_splitter = MarkdownHeaderTextSplitter(
            headers_to_split_on=[
                ("##", "section"),
                ("###", "subsection"),
            ],
            strip_headers=False,
        )
        # 兜底：对超大 section 再用字符切分
        self.fallback_splitter = RecursiveCharacterTextSplitter(
            chunk_size=2400,
            chunk_overlap=200,
        )

    def ingest_directory(self, data_dir: str) -> dict:
        data_path = Path(data_dir)
        total = 0
        files = list(data_path.rglob("*.md"))

        for md_file in files:
            try:
                loader = TextLoader(str(md_file), encoding="utf-8", autodetect_encoding=True)
                full_text = loader.load()[0].page_content

                # 按标题切分
                header_chunks = self.header_splitter.split_text(full_text)

                # 兜底：对超过 3000 字符的 section 再做字符切分
                final_chunks = []
                for chunk in header_chunks:
                    text = chunk.page_content  # MarkdownHeaderTextSplitter 返回 Document 对象
                    if len(text) > 3000:
                        subs = self.fallback_splitter.split_text(text)
                        final_chunks.extend(subs)
                    else:
                        final_chunks.append(text)

                from langchain_core.documents import Document
                docs = []
                for chunk_text in final_chunks:
                    if len(chunk_text.strip()) < 30:
                        continue  # 跳过过短片段
                    docs.append(Document(
                        page_content=chunk_text,
                        metadata={
                            "source": md_file.name,
                            "domain": "blogger",          # Layer 1 专业知识层统一标识
                            "category": "practical",
                            "type": "blogger",
                            "author": "生活化减脂",
                            "priority": "high",           # Layer 1 高优先级
                        }
                    ))

                self.vectorstore.add_documents(docs)
                total += len(docs)
            except Exception as exc:
                print(f"Failed to ingest {md_file.name}: {exc}")

        return {"chunks": total}
