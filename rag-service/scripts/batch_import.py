from pathlib import Path
import sys
sys.path.append(str(Path(__file__).parent.parent))

from services.pdf_processor import PDFProcessor
from services.embedder import EmbeddingService
from services.retriever import RetrievalService
import config

def batch_import_all():
    processor = PDFProcessor(config.CHUNK_SIZE, config.CHUNK_OVERLAP)
    embedder = EmbeddingService()
    retriever = RetrievalService(config.CHROMA_PERSIST_DIR)

    domains = {
        "01comprehensive": "comprehensive",
        "02kinesiology": "kinesiology",
        "03nutrition": "nutrition",
        "05practical": "practical"
    }

    total_files = 0
    total_chunks = 0

    for folder, domain in domains.items():
        folder_path = Path(config.PDF_BASE_PATH) / folder

        if not folder_path.exists():
            print(f"跳过不存在的文件夹: {folder_path}")
            continue

        for pdf_file in folder_path.glob("*.pdf"):
            print(f"处理 PDF: {pdf_file.name}")
            text = processor.extract_text(str(pdf_file))
            chunks = processor.chunk_text(text)

            if not chunks:
                print(f"  跳过（无可提取文本）")
                continue

            embeddings = embedder.embed_batch(chunks)
            metadatas = [{"source": pdf_file.name, "domain": domain, "chunk_index": i, "type": "pdf"} for i in range(len(chunks))]

            # Add in batches to avoid ChromaDB limit
            batch_size = 5000
            for i in range(0, len(chunks), batch_size):
                end_idx = min(i + batch_size, len(chunks))
                retriever.add_documents(
                    chunks[i:end_idx],
                    embeddings[i:end_idx],
                    metadatas[i:end_idx]
                )

            print(f"  添加 {len(chunks)} 个块")
            total_files += 1
            total_chunks += len(chunks)

        for md_file in folder_path.glob("*.md"):
            print(f"处理 Markdown: {md_file.name}")
            with open(md_file, 'r', encoding='utf-8') as f:
                text = f.read()
            chunks = processor.chunk_text(text)

            if not chunks:
                print(f"  跳过（无可提取文本）")
                continue

            embeddings = embedder.embed_batch(chunks)
            metadatas = [{"source": md_file.name, "domain": domain, "chunk_index": i, "type": "markdown"} for i in range(len(chunks))]

            # Add in batches to avoid ChromaDB limit
            batch_size = 5000
            for i in range(0, len(chunks), batch_size):
                end_idx = min(i + batch_size, len(chunks))
                retriever.add_documents(
                    chunks[i:end_idx],
                    embeddings[i:end_idx],
                    metadatas[i:end_idx]
                )

            print(f"  添加 {len(chunks)} 个块")
            total_files += 1
            total_chunks += len(chunks)

    return {"files": total_files, "chunks": total_chunks}

if __name__ == "__main__":
    result = batch_import_all()
    print(f"\n完成！处理 {result['files']} 个文件，添加 {result['chunks']} 个块")


