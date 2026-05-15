from typing import List, Protocol
from app.core.config import settings
import logging
import numpy as np

logger = logging.getLogger(__name__)


class EmbeddingProvider(Protocol):
    def embed(self, texts: List[str]) -> List[List[float]]: ...


class SentenceTransformerProvider:
    _model = None

    @classmethod
    def _get_model(cls):
        if cls._model is None:
            from sentence_transformers import SentenceTransformer
            cls._model = SentenceTransformer(settings.EMBEDDING_MODEL)
        return cls._model

    def embed(self, texts: List[str]) -> List[List[float]]:
        model = self._get_model()
        embeddings = model.encode(texts, normalize_embeddings=True)
        return embeddings.tolist()


class GeminiEmbeddingProvider:
    def embed(self, texts: List[str]) -> List[List[float]]:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        results = []
        for text in texts:
            result = genai.embed_content(
                model="models/embedding-001",
                content=text,
                task_type="retrieval_document",
            )
            results.append(result["embedding"])
        return results


def get_embedding_provider() -> EmbeddingProvider:
    if settings.EMBEDDING_PROVIDER == "gemini":
        return GeminiEmbeddingProvider()
    return SentenceTransformerProvider()


def cosine_similarity(a: List[float], b: List[float]) -> float:
    a_arr = np.array(a)
    b_arr = np.array(b)
    return float(np.dot(a_arr, b_arr) / (np.linalg.norm(a_arr) * np.linalg.norm(b_arr) + 1e-10))
