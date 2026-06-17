"""
一键入库：把所有知识库分层导入 ChromaDB

用法：
  python scripts/ingest_all.py              # 入库所有层
  python scripts/ingest_all.py --layer1      # 只入库 Layer 1（专业知识）
  python scripts/ingest_all.py --layer2      # 只入库 Layer 2（专业书）
  python scripts/ingest_all.py --layer1 --layer2  # 全部入库
"""
import sys, os
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))
sys.stdout.reconfigure(encoding='utf-8')

import config
from services.retriever import build_embeddings, build_vectorstore, build_practical_vectorstore
from services.ingest import IngestService, PracticalIngestService


def ingest_layer1():
    if not config.USE_PRACTICAL or not config.PRACTICAL_DATA_PATH:
        print("[Layer 1] SKIP — PRACTICAL_DATA_PATH not configured")
        return
    data = Path(config.PRACTICAL_DATA_PATH)
    if not data.exists():
        print(f"[Layer 1] SKIP — path not found: {data}")
        return

    print(f"[Layer 1] Loading embedding: {config.EMBEDDING_MODEL}")
    embeddings = build_embeddings()
    vs = build_practical_vectorstore(embeddings)
    if vs is None:
        print("[Layer 1] SKIP — vectorstore init failed")
        return
    svc = PracticalIngestService(vs)

    print(f"[Layer 1] Ingesting: {config.PRACTICAL_DATA_PATH}")
    result = svc.ingest_directory(config.PRACTICAL_DATA_PATH)
    print(f"[Layer 1] Done — {result['chunks']} chunks\n")


def ingest_layer2():
    data = Path(config.CLEANED_DATA_PATH)
    if not data.exists():
        print(f"[Layer 2] SKIP — path not found: {data}")
        return

    print(f"[Layer 2] Loading embedding: {config.EMBEDDING_MODEL}")
    embeddings = build_embeddings()
    vs = build_vectorstore(embeddings)
    svc = IngestService(vs)

    print(f"[Layer 2] Ingesting: {config.CLEANED_DATA_PATH}")
    result = svc.ingest_directory(config.CLEANED_DATA_PATH)
    print(f"[Layer 2] Done — {result['chunks']} chunks\n")


def main():
    args = set(sys.argv[1:])
    do_layer1 = "--layer1" in args or "--blogger" in args
    do_layer2 = "--layer2" in args
    if not do_layer1 and not do_layer2:
        do_layer1 = do_layer2 = True  # 默认全部

    print("=" * 60)
    print("RightNow RAG — Multi-Layer Ingest")
    print("=" * 60)
    print(f"Embedding model: {config.EMBEDDING_MODEL}")
    print(f"Layer 1 (practical): {'ENABLED' if do_layer1 else 'SKIP'}")
    print(f"Layer 2 (books):     {'ENABLED' if do_layer2 else 'SKIP'}")
    print()

    if do_layer1:
        ingest_layer1()
    if do_layer2:
        ingest_layer2()

    print("=" * 60)
    print("All done.")


if __name__ == "__main__":
    main()
