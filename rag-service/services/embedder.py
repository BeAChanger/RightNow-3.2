from sentence_transformers import SentenceTransformer
import config


class EmbeddingService:
    def __init__(self):
        self.model = SentenceTransformer(config.EMBEDDING_MODEL)

    def embed_text(self, text: str):
        return self.model.encode(text).tolist()

    def embed_batch(self, texts: list[str]):
        return self.model.encode(texts).tolist()
